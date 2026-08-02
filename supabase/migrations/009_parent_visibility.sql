-- ============================================================
-- iMathAcademy — Migration 009
-- Parents can see their own children's money and certificates
--
-- The parent portal is about to show fees, subscription status and
-- certificates. None of those tables let a parent read anything
-- today, so the screens would render empty with no error — the
-- same silent shape as the earlier curriculum problem.
--
-- Every policy is scoped through parent_student, so a parent sees
-- their own children and nobody else's.
--
-- Safe to re-run.
-- ============================================================


-- ── FEES ────────────────────────────────────────────────────
alter table fees enable row level security;

drop policy if exists fees_parent_read on fees;
create policy fees_parent_read on fees
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = fees.student_id
        and ps.parent_id  = auth.uid()
    )
  );

-- A student may see their own
drop policy if exists fees_student_read on fees;
create policy fees_student_read on fees
  for select using (student_id = auth.uid());

-- Staff keep full control
drop policy if exists fees_staff_all on fees;
create policy fees_staff_all on fees
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── SUBSCRIPTIONS ───────────────────────────────────────────
alter table subscriptions enable row level security;

drop policy if exists subs_parent_read on subscriptions;
create policy subs_parent_read on subscriptions
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = subscriptions.student_id
        and ps.parent_id  = auth.uid()
    )
  );

drop policy if exists subs_student_read on subscriptions;
create policy subs_student_read on subscriptions
  for select using (student_id = auth.uid());

drop policy if exists subs_staff_all on subscriptions;
create policy subs_staff_all on subscriptions
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── VERIFY ──────────────────────────────────────────────────
-- Each table should have both a read policy and a write policy.
-- A table with reads and no writes silently rejects every save.

select tablename,
       count(*) filter (where cmd = 'SELECT') as read_policies,
       count(*) filter (where cmd = 'ALL')    as write_policies
from pg_policies
where schemaname = 'public'
  and tablename in ('fees','subscriptions','student_level_completions')
group by tablename
order by tablename;
