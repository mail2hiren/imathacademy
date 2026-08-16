-- ============================================================
-- iMathAcademy — Migration 016
-- The teacher's worksheet options
--
-- A deadline and a time limit, both optional. The abacus mode a
-- worksheet was built for, so the child's solver knows whether to
-- lock typing. And the constraints Megha chose, kept so a sheet can
-- be rebuilt the same way later.
--
-- Safe to re-run.
-- ============================================================

alter table lx_worksheets add column if not exists due_date        date;
alter table lx_worksheets add column if not exists time_limit_mins int;
alter table lx_worksheets add column if not exists constraints     jsonb;
alter table lx_worksheets add column if not exists theme           text;
alter table lx_worksheets add column if not exists difficulty      text;

comment on column lx_worksheets.due_date is
  'Optional. Shown to the child; nothing is locked when it passes.';
comment on column lx_worksheets.time_limit_mins is
  'Optional. A countdown while they work. Not enforced — it stops nobody mid-sum.';
comment on column lx_worksheets.constraints is
  'What the teacher restricted: addition only, no subtraction, a ceiling on totals.';

-- ── CHECK ───────────────────────────────────────────────────
select column_name, data_type
from information_schema.columns
where table_name = 'lx_worksheets'
  and column_name in ('due_date','time_limit_mins','constraints','theme','difficulty')
order by column_name;
