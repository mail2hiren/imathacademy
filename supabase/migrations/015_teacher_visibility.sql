-- ============================================================
-- iMathAcademy — Migration 015
-- A teacher can see how their students are doing
--
-- The teacher dashboard shows worksheet scores but nothing about
-- practice or the weekly quiz — which is most of what a child
-- actually does between classes. The tables were never readable by
-- a teacher, so the screens could not have shown them.
--
-- Also lets a teacher retire a worksheet. There is currently no way
-- at all to take one back: a worksheet assigned by mistake stays in
-- a child's list forever.
--
-- Safe to re-run.
-- ============================================================


-- ── PRACTICE ────────────────────────────────────────────────
alter table practice_sessions enable row level security;

drop policy if exists ps_own on practice_sessions;
create policy ps_own on practice_sessions
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists ps_staff_read on practice_sessions;
create policy ps_staff_read on practice_sessions
  for select using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );

drop policy if exists ps_parent_read on practice_sessions;
create policy ps_parent_read on practice_sessions
  for select using (
    exists (select 1 from parent_student ps
            where ps.student_id = practice_sessions.student_id
              and ps.parent_id = auth.uid())
  );


-- ── WEEKLY QUIZ ─────────────────────────────────────────────
alter table quiz_results enable row level security;

drop policy if exists qr_own on quiz_results;
create policy qr_own on quiz_results
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists qr_staff_read on quiz_results;
create policy qr_staff_read on quiz_results
  for select using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );

drop policy if exists qr_parent_read on quiz_results;
create policy qr_parent_read on quiz_results
  for select using (
    exists (select 1 from parent_student ps
            where ps.student_id = quiz_results.student_id
              and ps.parent_id = auth.uid())
  );


-- ── WORKSHEET RESPONSES ─────────────────────────────────────
alter table worksheet_responses enable row level security;

drop policy if exists wr_own on worksheet_responses;
create policy wr_own on worksheet_responses
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists wr_staff_read on worksheet_responses;
create policy wr_staff_read on worksheet_responses
  for select using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );

drop policy if exists wr_parent_read on worksheet_responses;
create policy wr_parent_read on worksheet_responses
  for select using (
    exists (select 1 from parent_student ps
            where ps.student_id = worksheet_responses.student_id
              and ps.parent_id = auth.uid())
  );


-- ── TAKING A WORKSHEET BACK ─────────────────────────────────
-- Nothing is deleted. is_active = false stops it being served and
-- can be undone, so a mistake costs nothing.
alter table lx_worksheets enable row level security;

drop policy if exists lw_read on lx_worksheets;
create policy lw_read on lx_worksheets
  for select using (true);

drop policy if exists lw_staff_all on lx_worksheets;
create policy lw_staff_all on lx_worksheets
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── CHECK ───────────────────────────────────────────────────
-- Every table needs a read AND a write policy. Reads without writes
-- silently reject every save while reporting success.
select tablename,
       count(*) filter (where cmd = 'SELECT') as reads,
       count(*) filter (where cmd = 'ALL')    as writes
from pg_policies
where schemaname = 'public'
  and tablename in ('practice_sessions','quiz_results','worksheet_responses','lx_worksheets')
group by tablename
order by tablename;

-- Anything wide open? A policy with qual = true ignores every other.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and qual::text = 'true'
  and tablename in ('practice_sessions','quiz_results','worksheet_responses','lx_worksheets')
  and cmd <> 'SELECT';
