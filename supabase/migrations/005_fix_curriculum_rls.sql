-- ============================================================
-- iMathAcademy — Migration 005
-- Fixes a regression introduced by migration 003
--
-- Migration 003 enabled row level security on the curriculum
-- tables so students could READ level names and concept status.
-- It created SELECT policies and nothing else.
--
-- With RLS enabled and no UPDATE policy, Postgres blocks every
-- write and reports success with zero rows affected. So the
-- curriculum admin said "saved" and saved nothing.
--
-- This grants staff the write access they had before 003.
--
-- Safe to re-run.
-- ============================================================


-- ── curriculum_levels ───────────────────────────────────────
-- Everyone signed in may read. Only staff may change.

drop policy if exists curriculum_levels_read on curriculum_levels;
create policy curriculum_levels_read on curriculum_levels
  for select to authenticated using (true);

drop policy if exists curriculum_levels_staff_write on curriculum_levels;
create policy curriculum_levels_staff_write on curriculum_levels
  for all to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  )
  with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── curriculum_level_concepts ───────────────────────────────

drop policy if exists curriculum_level_concepts_read on curriculum_level_concepts;
create policy curriculum_level_concepts_read on curriculum_level_concepts
  for select to authenticated using (true);

drop policy if exists curriculum_level_concepts_staff_write on curriculum_level_concepts;
create policy curriculum_level_concepts_staff_write on curriculum_level_concepts
  for all to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  )
  with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── curriculum_concepts ─────────────────────────────────────

drop policy if exists curriculum_concepts_read on curriculum_concepts;
create policy curriculum_concepts_read on curriculum_concepts
  for select to authenticated using (true);

drop policy if exists curriculum_concepts_staff_write on curriculum_concepts;
create policy curriculum_concepts_staff_write on curriculum_concepts
  for all to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  )
  with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── curriculum_formulas, if it exists ───────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_name = 'curriculum_formulas') then

    execute 'alter table curriculum_formulas enable row level security';

    execute 'drop policy if exists curriculum_formulas_read on curriculum_formulas';
    execute 'create policy curriculum_formulas_read on curriculum_formulas
               for select to authenticated using (true)';

    execute 'drop policy if exists curriculum_formulas_staff_write on curriculum_formulas';
    execute 'create policy curriculum_formulas_staff_write on curriculum_formulas
               for all to authenticated
               using (exists (select 1 from users u where u.id = auth.uid() and u.role in (''teacher'',''admin'')))
               with check (exists (select 1 from users u where u.id = auth.uid() and u.role in (''teacher'',''admin'')))';
  end if;
end $$;


-- ── VERIFY ──────────────────────────────────────────────────
-- Each curriculum table should now have a read policy AND a
-- write policy. A table with only a read policy cannot be saved.

select
  tablename,
  count(*) filter (where cmd = 'SELECT') as read_policies,
  count(*) filter (where cmd = 'ALL')    as write_policies
from pg_policies
where schemaname = 'public'
  and tablename like 'curriculum%'
group by tablename
order by tablename;
