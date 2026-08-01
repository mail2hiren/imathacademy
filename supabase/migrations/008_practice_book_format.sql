-- ============================================================
-- iMathAcademy — Migration 008
-- The curriculum learns Megha's practice book format
--
-- Three gaps this closes:
--
-- 1. ROWS. curriculum_levels has one flat min_rows/max_rows per
--    level. But rows depend on the level AND the digit pattern —
--    single digits take 8 to 10 rows where three-digit takes 3,
--    and both appear on the same sheet. Megha's own Jr7 paper has
--    9 rows of two-digit, 4 rows of three-digit and 4 rows of
--    four-digit side by side. One flat pair cannot say that, which
--    is why the generator produced a horizontal "9 - ? = ?"
--    instead of a column sum.
--
-- 2. EXERCISE TYPES. Her books hold six distinct kinds of
--    exercise. The system only knew "worksheet".
--
-- 3. SESSION SHAPE. About 3 pages, 20 sums a page, plus 10 to 20
--    orals. required_practice_sessions was counting sessions of
--    any size, so five questions counted the same as sixty.
--
-- Safe to re-run.
-- ============================================================


-- ── PART 1 — ROWS BY LEVEL AND DIGIT PATTERN ────────────────

create table if not exists curriculum_row_rules (
  id            uuid primary key default gen_random_uuid(),
  level_code    text not null,

  -- '1d', '2d+1d', '2d+2d', '3d+2d', '3d+3d', '4d+4d'
  digit_pattern text not null,

  min_rows      int  not null,
  max_rows      int  not null,

  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),

  constraint uq_row_rule unique (level_code, digit_pattern)
);

create index if not exists idx_row_rules_level
  on curriculum_row_rules (level_code, sort_order);

comment on table curriculum_row_rules is
  'How many rows a column sum has, for each digit pattern at each level. Rows grow with the level and shrink as the digits widen.';


-- ── PART 2 — EXERCISE TYPES ─────────────────────────────────
-- The six kinds of exercise in Megha's books. A level switches
-- on the ones it uses.

alter table curriculum_levels
  add column if not exists ex_beads_to_numbers boolean not null default false;
alter table curriculum_levels
  add column if not exists ex_abacus_columns   boolean not null default true;
alter table curriculum_levels
  add column if not exists ex_mental_columns   boolean not null default true;
alter table curriculum_levels
  add column if not exists ex_multiplication   boolean not null default false;
alter table curriculum_levels
  add column if not exists ex_division         boolean not null default false;
alter table curriculum_levels
  add column if not exists ex_orals            boolean not null default true;

comment on column curriculum_levels.ex_beads_to_numbers is
  'Read a bead diagram and write the number. Used in the first two or three levels only.';
comment on column curriculum_levels.ex_orals is
  'The numbers are read aloud and the child works them on the abacus, writing only the answer.';


-- ── PART 3 — WHAT A SESSION IS ──────────────────────────────

alter table curriculum_levels
  add column if not exists sums_per_page     int not null default 20;
alter table curriculum_levels
  add column if not exists pages_per_session int not null default 3;
alter table curriculum_levels
  add column if not exists orals_per_session int not null default 10;

comment on column curriculum_levels.orals_per_session is
  'At least 10 in the early levels, rising to 20 higher up.';


-- ── PART 4 — ROW RULE DEFAULTS ──────────────────────────────
-- Rows climb from 3 at the lowest level to 12 at the highest, and
-- fall away as the digits widen. These are a sensible starting
-- point, not gospel — Megha should adjust them against her books.

insert into curriculum_row_rules (level_code, digit_pattern, min_rows, max_rows, sort_order)
values
  -- L0 and L1: getting started, short columns
  ('L0','1d',    3, 4,  1),
  ('L1','1d',    4, 5,  1),

  -- L2 and L3: single digits lengthen, two-digit work appears
  ('L2','1d',    6, 8,  1),
  ('L2','2d+1d', 4, 5,  2),
  ('L3','1d',    8, 10, 1),
  ('L3','2d+1d', 5, 6,  2),
  ('L3','2d+2d', 3, 4,  3),

  -- L4 and L5: two-digit becomes the mainstay
  ('L4','1d',    8, 10, 1),
  ('L4','2d+1d', 6, 7,  2),
  ('L4','2d+2d', 4, 5,  3),
  ('L5','1d',    9, 11, 1),
  ('L5','2d+2d', 5, 6,  2),
  ('L5','3d+2d', 3, 4,  3),

  -- L6 to L8: longest columns, widest numbers
  ('L6','1d',    10, 12, 1),
  ('L6','2d+2d',  6, 7,  2),
  ('L6','3d+3d',  3, 4,  3),
  ('L7','2d+2d',  8, 9,  1),
  ('L7','3d+3d',  4, 5,  2),
  ('L7','4d+4d',  3, 4,  3),
  ('L8','2d+2d', 10, 12, 1),
  ('L8','3d+3d',  5, 6,  2),
  ('L8','4d+4d',  4, 5,  3)
on conflict (level_code, digit_pattern) do nothing;


-- ── PART 5 — EXERCISE TYPES PER LEVEL ───────────────────────
-- Beads to Numbers in the first three levels. Multiplication and
-- division from the middle levels, matching her Jr7 paper.

update curriculum_levels set ex_beads_to_numbers = true  where level_code in ('L0','L1','L2');
update curriculum_levels set ex_multiplication   = true  where level_code in ('L4','L5','L6','L7','L8');
update curriculum_levels set ex_division         = true  where level_code in ('L5','L6','L7','L8');

-- Orals grow with the level
update curriculum_levels set orals_per_session = 10 where level_code in ('L0','L1','L2','L3');
update curriculum_levels set orals_per_session = 15 where level_code in ('L4','L5');
update curriculum_levels set orals_per_session = 20 where level_code in ('L6','L7','L8');


-- ── PART 6 — ROW LEVEL SECURITY ─────────────────────────────

alter table curriculum_row_rules enable row level security;

drop policy if exists row_rules_read on curriculum_row_rules;
create policy row_rules_read on curriculum_row_rules
  for select to authenticated using (true);

-- Staff write. Without this the table would silently reject every
-- update and report success, which is what happened when RLS was
-- first switched on for the curriculum tables.
drop policy if exists row_rules_staff_write on curriculum_row_rules;
create policy row_rules_staff_write on curriculum_row_rules
  for all to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  )
  with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── PART 7 — CHECK IT ───────────────────────────────────────

-- Rows per level and pattern
select level_code, digit_pattern, min_rows || '–' || max_rows as rows
from curriculum_row_rules
order by level_code, sort_order;

-- What each level teaches, and what a session looks like
select level_code, level_name,
       ex_beads_to_numbers as beads, ex_abacus_columns as abacus,
       ex_mental_columns   as mental, ex_multiplication as mult,
       ex_division as div, ex_orals as orals,
       pages_per_session || ' x ' || sums_per_page || ' sums' as session,
       orals_per_session as orals_n
from curriculum_levels
order by level_code;
