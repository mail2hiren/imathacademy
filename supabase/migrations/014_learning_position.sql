-- ============================================================
-- iMathAcademy — Migration 014
-- Where a child is *within* a level
--
-- Difficulty ramps across a page today, but that page is the same
-- on day one and day sixty. A beginner meets five-row two-digit
-- work as question twenty on their first session, and a child who
-- has mastered L0 still starts at 2 + 2 - 1.
--
-- This records how far through a level each child has come, as a
-- number from 0 to 1. The generator centres their page on it.
--
-- It decides what a child practises TODAY. It does not decide when
-- they move up — that stays the three gates: worksheets done,
-- practice sessions, and the level test.
--
-- Safe to re-run.
-- ============================================================

create table if not exists student_level_position (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references users(id) on delete cascade,
  level_code  text not null,

  -- 0 = just arrived at this level, 1 = working at its full range
  position    numeric(4,3) not null default 0.100
              check (position >= 0 and position <= 1),

  -- Megha's floor. A child she knows is capable never drops below
  -- this, however one bad afternoon goes.
  floor_pos   numeric(4,3) not null default 0.000
              check (floor_pos >= 0 and floor_pos <= 1),

  -- so a teacher can see whether this moved on its own or she set it
  set_by      uuid references users(id),
  set_at      timestamptz,

  sessions    int not null default 0,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),

  constraint uq_student_level unique (student_id, level_code)
);

create index if not exists idx_position_student
  on student_level_position (student_id, level_code);

comment on table student_level_position is
  'How far through a level a child has come. Moves on their own results, within a floor a teacher may set.';
comment on column student_level_position.floor_pos is
  'Set by a teacher. The position may drift down but never below this.';


-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table student_level_position enable row level security;

drop policy if exists slp_student_read on student_level_position;
create policy slp_student_read on student_level_position
  for select using (student_id = auth.uid());

drop policy if exists slp_student_write on student_level_position;
create policy slp_student_write on student_level_position
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists slp_parent_read on student_level_position;
create policy slp_parent_read on student_level_position
  for select using (
    exists (select 1 from parent_student ps
            where ps.student_id = student_level_position.student_id
              and ps.parent_id = auth.uid())
  );

drop policy if exists slp_staff_all on student_level_position;
create policy slp_staff_all on student_level_position
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── EVERY CURRENT STUDENT STARTS NEAR THE BOTTOM ────────────
insert into student_level_position (student_id, level_code, position)
select u.id, 'L' || coalesce(u.current_level, 0), 0.100
from users u
where u.role = 'student' and u.is_active
on conflict (student_id, level_code) do nothing;


-- ── CHECK ───────────────────────────────────────────────────
select u.full_name, p.level_code, p.position, p.floor_pos, p.sessions
from student_level_position p
join users u on u.id = p.student_id
order by p.level_code, u.full_name;

select tablename,
       count(*) filter (where cmd = 'SELECT') as reads,
       count(*) filter (where cmd = 'ALL')    as writes
from pg_policies
where schemaname = 'public' and tablename = 'student_level_position'
group by tablename;
