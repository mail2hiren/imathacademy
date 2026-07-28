-- ============================================================
-- iMathAcademy — Migration 001
-- Multi-track enrollments: replaces users.current_level
--
-- Run each PART separately in the Supabase SQL editor.
-- Read the output of PART 0 before running PART 3.
-- Nothing is dropped. users.current_level is left intact.
-- ============================================================


-- ============================================================
-- PART 0 — VERIFY BEFORE YOU CHANGE ANYTHING
-- Run this first and read the results.
-- ============================================================

-- 0a. What programs exist, and what are their ids?
select id, name from programs order by name;

-- 0b. How many students, and do they all have a batch?
select
  count(*) filter (where role = 'student')                     as total_students,
  count(*) filter (where role = 'student' and current_level is null) as null_level,
  (select count(distinct student_id) from batch_students)      as students_with_batch
from users;

-- 0c. Students who are NOT in any batch — these need a default program
select u.id, u.full_name, u.current_level
from users u
where u.role = 'student'
  and not exists (select 1 from batch_students bs where bs.student_id = u.id);

-- 0d. Do any students sit in batches from more than one program?
select bs.student_id, count(distinct b.program_id) as program_count
from batch_students bs
join batches b on b.id = bs.batch_id
where b.program_id is not null
group by bs.student_id
having count(distinct b.program_id) > 1;

-- 0e. What level codes does the curriculum actually define?
select level_code, level_name from curriculum_levels order by level_code;


-- ============================================================
-- PART 1 — CREATE THE TABLE
-- ============================================================

create table if not exists student_enrollments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references users(id)    on delete cascade,
  program_id    uuid not null references programs(id) on delete restrict,

  -- Opaque text key, never parsed as a number.
  -- Abacus: 'L1'..'L10'   Vedic: 'M1'..'M8'   School: 'G1'..'G12'
  level_code    text not null,

  status        text not null default 'active'
                check (status in ('active','paused','completed')),

  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A student has at most one enrollment per program
  constraint student_enrollments_unique_track unique (student_id, program_id)
);

create index if not exists idx_enrollments_student
  on student_enrollments (student_id);

create index if not exists idx_enrollments_active
  on student_enrollments (student_id, status) where status = 'active';

comment on table student_enrollments is
  'One row per student per program. Replaces users.current_level, which could only hold a single track.';

comment on column student_enrollments.level_code is
  'Opaque text key. Never parse this into an integer — Vedic uses M-prefixes, School Maths uses G-prefixes.';


-- keep updated_at current
create or replace function touch_student_enrollments()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_student_enrollments on student_enrollments;
create trigger trg_touch_student_enrollments
  before update on student_enrollments
  for each row execute function touch_student_enrollments();


-- ============================================================
-- PART 2 — ROW LEVEL SECURITY
-- ============================================================

alter table student_enrollments enable row level security;

-- Students read their own enrollments
drop policy if exists enrollments_student_read on student_enrollments;
create policy enrollments_student_read on student_enrollments
  for select using (student_id = auth.uid());

-- Parents read their children's enrollments
drop policy if exists enrollments_parent_read on student_enrollments;
create policy enrollments_parent_read on student_enrollments
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = student_enrollments.student_id
        and ps.parent_id  = auth.uid()
    )
  );

-- Teachers and admins read everything
drop policy if exists enrollments_staff_read on student_enrollments;
create policy enrollments_staff_read on student_enrollments
  for select using (
    exists (
      select 1 from users u
      where u.id = auth.uid() and u.role in ('teacher','admin')
    )
  );

-- Only admins write
drop policy if exists enrollments_admin_write on student_enrollments;
create policy enrollments_admin_write on student_enrollments
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );


-- ============================================================
-- PART 3 — BACKFILL
--
-- Read PART 0 output first.
-- Replace the ABACUS_PROGRAM_ID below with the real id from query 0a
-- before running step 3b.
-- ============================================================

-- 3a. Students who ARE in a batch: take the program from their batch,
--     the level from users.current_level.
insert into student_enrollments (student_id, program_id, level_code, status)
select distinct on (u.id, b.program_id)
  u.id,
  b.program_id,
  'L' || coalesce(u.current_level, 1)::text,
  'active'
from users u
join batch_students bs on bs.student_id = u.id
join batches b         on b.id = bs.batch_id
where u.role = 'student'
  and b.program_id is not null
order by u.id, b.program_id, bs.batch_id
on conflict (student_id, program_id) do nothing;


-- 3b. Students with NO batch: default them to Abacus.
--     >>> PASTE THE ABACUS PROGRAM ID FROM QUERY 0a <<<
insert into student_enrollments (student_id, program_id, level_code, status)
select
  u.id,
  '503089d2-3d04-4071-8200-b411d0429ae6'::uuid,   -- Abacus program id
  'L' || coalesce(u.current_level, 1)::text,
  'active'
from users u
where u.role = 'student'
  and not exists (
    select 1 from student_enrollments e where e.student_id = u.id
  )
on conflict (student_id, program_id) do nothing;


-- ============================================================
-- PART 4 — VERIFY THE BACKFILL
-- Every student should now have at least one enrollment.
-- ============================================================

-- 4a. Coverage check — expect zero rows
select u.id, u.full_name
from users u
where u.role = 'student'
  and not exists (select 1 from student_enrollments e where e.student_id = u.id);

-- 4b. Does every enrollment point at a level the curriculum defines?
--     Expect zero rows (ignore this if curriculum_levels is not yet fully seeded)
select e.id, e.student_id, e.level_code
from student_enrollments e
where not exists (
  select 1 from curriculum_levels cl where cl.level_code = e.level_code
);

-- 4c. Spot check
select
  u.full_name,
  p.name  as program,
  e.level_code,
  e.status,
  u.current_level as old_value
from student_enrollments e
join users u    on u.id = e.student_id
join programs p on p.id = e.program_id
order by u.full_name;


-- ============================================================
-- PART 5 — CONVENIENCE VIEW
-- Gives the app a single place to read a student's active tracks.
-- ============================================================

create or replace view v_student_tracks as
select
  e.student_id,
  e.program_id,
  p.name        as program_name,
  e.level_code,
  cl.level_name,
  cl.core_focus,
  e.status,
  e.started_at
from student_enrollments e
join programs p           on p.id = e.program_id
left join curriculum_levels cl on cl.level_code = e.level_code
where e.status = 'active';


-- ============================================================
-- PART 6 — DO NOT RUN YET
--
-- users.current_level stays in place until every read has been
-- migrated to student_enrollments and verified in production.
-- Target: after the student portal, LX Designer and admin portal
-- all read from the new table.
--
-- alter table users drop column current_level;
-- ============================================================
