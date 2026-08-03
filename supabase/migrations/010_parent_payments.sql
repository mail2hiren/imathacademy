-- ============================================================
-- iMathAcademy — Migration 010
-- Parents can pay
--
-- Migration 009 let parents READ their children's fees. To pay one
-- they must also be able to mark it paid, and to renew they must be
-- able to create a subscription row.
--
-- Scoped through parent_student throughout, so a parent can only
-- ever touch their own children's records.
--
-- Everyone needs to read pricing_plans, or the plan cards are empty.
--
-- NOTE ON TRUST: this records the payment from the browser after
-- Razorpay confirms it, which is what the existing student
-- subscription page already does. A determined parent could call
-- the same update without paying. For a small, known set of
-- families that is an acceptable trade; if the school grows, the
-- payment should be written by a Razorpay webhook instead and
-- these write policies removed.
--
-- Safe to re-run.
-- ============================================================


-- ── FEES: a parent may settle their own child's fee ─────────
drop policy if exists fees_parent_pay on fees;
create policy fees_parent_pay on fees
  for update using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = fees.student_id
        and ps.parent_id  = auth.uid()
    )
  ) with check (
    exists (
      select 1 from parent_student ps
      where ps.student_id = fees.student_id
        and ps.parent_id  = auth.uid()
    )
  );


-- ── SUBSCRIPTIONS: a parent may renew for their own child ───
drop policy if exists subs_parent_write on subscriptions;
create policy subs_parent_write on subscriptions
  for insert with check (
    exists (
      select 1 from parent_student ps
      where ps.student_id = subscriptions.student_id
        and ps.parent_id  = auth.uid()
    )
  );

-- and close the previous one when a new one starts
drop policy if exists subs_parent_expire on subscriptions;
create policy subs_parent_expire on subscriptions
  for update using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = subscriptions.student_id
        and ps.parent_id  = auth.uid()
    )
  ) with check (
    exists (
      select 1 from parent_student ps
      where ps.student_id = subscriptions.student_id
        and ps.parent_id  = auth.uid()
    )
  );


-- ── PRICING: everyone signed in needs to see the plans ──────
alter table pricing_plans enable row level security;

drop policy if exists pricing_read on pricing_plans;
create policy pricing_read on pricing_plans
  for select to authenticated using (true);

drop policy if exists pricing_staff_write on pricing_plans;
create policy pricing_staff_write on pricing_plans
  for all to authenticated
  using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── VERIFY ──────────────────────────────────────────────────
select tablename,
       count(*) filter (where cmd = 'SELECT') as reads,
       count(*) filter (where cmd = 'INSERT') as inserts,
       count(*) filter (where cmd = 'UPDATE') as updates,
       count(*) filter (where cmd = 'ALL')    as all_ops
from pg_policies
where schemaname = 'public'
  and tablename in ('fees','subscriptions','pricing_plans')
group by tablename
order by tablename;

-- What plans exist? A quarterly row needs adding here if it is missing.
select country_code, plan_code, plan_name, amount, duration_days, is_active
from pricing_plans
order by country_code, duration_days;
