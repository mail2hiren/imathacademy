-- ============================================================
-- iMathAcademy — Migration 003
-- Level completion, level tests and certificates
--
-- A child completes a level by clearing three gates:
--
--   1. every worksheet for the level submitted
--   2. enough practice sessions
--   3. a pass on the level test
--
-- Only then do they earn the certificate and move up.
--
-- Megha sets "enough practice" and the pass mark per level, so
-- L0 and L8 can demand different things. Nothing is hardcoded.
--
-- Safe to re-run.
-- ============================================================


-- ── PART 1 — COMPLETION CRITERIA, SET PER LEVEL ─────────────
-- These live on curriculum_levels so they sit beside the rest of
-- Megha's level settings rather than in a separate place.

alter table curriculum_levels
  add column if not exists required_practice_sessions int not null default 20;

alter table curriculum_levels
  add column if not exists test_pass_mark int not null default 80;

alter table curriculum_levels
  add column if not exists certificate_title text;

comment on column curriculum_levels.required_practice_sessions is
  'How many practice sessions a child must complete before this level can be finished.';
comment on column curriculum_levels.test_pass_mark is
  'Percentage needed on the level test. 80 means 80%.';
comment on column curriculum_levels.certificate_title is
  'Wording on the certificate, e.g. "Abacus Foundation — Level 1". Falls back to the level name.';


-- ── PART 2 — THE LEVEL TEST ─────────────────────────────────
-- A level test is a worksheet, not a new kind of thing. Megha
-- builds it in the LX Designer exactly as she builds any other,
-- then flags it. Children take it through the same solver, and
-- it is scored by the same code.

alter table lx_worksheets
  add column if not exists is_level_test boolean not null default false;

alter table lx_worksheets
  add column if not exists level_code text;

-- Backfill level_code from the existing numeric level column
update lx_worksheets
   set level_code = 'L' || level::text
 where level_code is null
   and level is not null;

create index if not exists idx_worksheets_level_test
  on lx_worksheets (level_code, is_level_test)
  where is_level_test = true;

comment on column lx_worksheets.is_level_test is
  'A level test rather than ordinary practice. Passing it is the third gate to completing a level.';


-- ── PART 3 — COMPLETIONS AND CERTIFICATES ───────────────────

create table if not exists student_level_completions (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references users(id) on delete cascade,
  level_code         text not null,

  -- evidence at the moment of completion, kept for the record
  worksheets_done    int,
  practice_sessions  int,
  test_score         int,          -- percentage
  test_worksheet_id  uuid references lx_worksheets(id) on delete set null,

  -- human-readable, printed on the certificate: IMA-L1-000042
  certificate_number text unique,

  completed_at       timestamptz not null default now(),
  issued_by          uuid references users(id) on delete set null
);

-- A level is completed once
create unique index if not exists uq_completion_per_level
  on student_level_completions (student_id, level_code);

create index if not exists idx_completions_student
  on student_level_completions (student_id, completed_at desc);

comment on table student_level_completions is
  'One row per student per completed level. Holds the evidence and the certificate number.';


-- ── PART 4 — CERTIFICATE NUMBERING ──────────────────────────
-- Sequential per level, so a certificate number is meaningful
-- and cannot collide: IMA-L1-000001, IMA-L1-000002 ...

create sequence if not exists certificate_seq start 1;

create or replace function assign_certificate_number()
returns trigger language plpgsql as $$
begin
  if new.certificate_number is null then
    new.certificate_number :=
      'IMA-' || new.level_code || '-' || lpad(nextval('certificate_seq')::text, 6, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_certificate_number on student_level_completions;
create trigger trg_certificate_number
  before insert on student_level_completions
  for each row execute function assign_certificate_number();


-- ── PART 5 — ROW LEVEL SECURITY ─────────────────────────────

alter table student_level_completions enable row level security;

drop policy if exists completions_student_read on student_level_completions;
create policy completions_student_read on student_level_completions
  for select using (student_id = auth.uid());

drop policy if exists completions_parent_read on student_level_completions;
create policy completions_parent_read on student_level_completions
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = student_level_completions.student_id
        and ps.parent_id  = auth.uid()
    )
  );

-- Only staff award a completion. A child cannot certify themselves.
drop policy if exists completions_staff_all on student_level_completions;
create policy completions_staff_all on student_level_completions
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );

-- Students need to read the criteria to see their own progress
alter table curriculum_levels enable row level security;
drop policy if exists curriculum_levels_read on curriculum_levels;
create policy curriculum_levels_read on curriculum_levels
  for select to authenticated using (true);

alter table curriculum_level_concepts enable row level security;
drop policy if exists curriculum_level_concepts_read on curriculum_level_concepts;
create policy curriculum_level_concepts_read on curriculum_level_concepts
  for select to authenticated using (true);

alter table curriculum_concepts enable row level security;
drop policy if exists curriculum_concepts_read on curriculum_concepts;
create policy curriculum_concepts_read on curriculum_concepts
  for select to authenticated using (true);


-- ── PART 6 — SET THE CRITERIA PER LEVEL ─────────────────────
-- Defaults are 20 practice sessions and an 80% pass. Adjust to
-- match what Megha actually expects, then re-run this section.

-- update curriculum_levels set required_practice_sessions = 12, test_pass_mark = 70 where level_code = 'L0';
-- update curriculum_levels set required_practice_sessions = 20, test_pass_mark = 80 where level_code = 'L1';

select level_code, level_name, required_practice_sessions, test_pass_mark
from curriculum_levels
order by level_code;


-- ── PART 7 — VERIFY ─────────────────────────────────────────

-- Which levels have a test built?
select level_code, count(*) as level_tests
from lx_worksheets
where is_level_test = true
group by level_code
order by level_code;

-- Nobody has completed anything yet
select count(*) as completions from student_level_completions;
