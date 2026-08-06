-- ============================================================
-- iMathAcademy — Migration 012a
-- The plan constraint blocks 'trial'
--
-- subscriptions.plan carries a CHECK listing the plans that existed
-- when the table was built. 'trial' is not among them, so migration
-- 012 could not insert a single row.
--
-- The same will happen the moment Megha adds a quarterly plan in the
-- admin screen — the CHECK duplicates what pricing_plans already
-- defines, and the two drift apart silently.
--
-- PART 0 is read-only. Run it and read the output first.
-- ============================================================


-- ── PART 0 — WHAT DOES IT ALLOW TODAY? ──────────────────────

select con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'subscriptions'
  and con.contype = 'c';

-- What is actually in use, so nothing legitimate is lost
select plan, count(*) from subscriptions group by plan order by plan;

-- And what the admin screen offers
select plan_code, plan_name, amount, duration_days
from pricing_plans order by duration_days;


-- ── PART 1 — WIDEN THE LIST ─────────────────────────────────
-- Postgres does not allow a subquery inside a CHECK, so the list
-- cannot read from pricing_plans directly. It is enumerated here
-- instead, with quarterly included ahead of need.
--
-- BE AWARE: this is a second copy of the valid plans, and Megha
-- edits the first one in the admin Pricing screen. If she ever adds
-- a plan code that is not in this list, subscriptions to it will
-- fail with exactly the error that brought us here. Add the code
-- below at the same time, or drop the constraint entirely and let
-- pricing_plans be the only authority.

alter table subscriptions drop constraint if exists subscriptions_plan_check;

alter table subscriptions
  add constraint subscriptions_plan_check
  check (plan in (
    'trial','free',
    'monthly','quarterly','halfyearly','annual','lifetime'
  ));

-- Should a plan code ever be added that is not listed above, this
-- finds it before it causes a failure:
--
--   select distinct plan_code from pricing_plans
--   where plan_code not in ('trial','free','monthly','quarterly',
--                           'halfyearly','annual','lifetime');


-- ── PART 2 — PAYMENT METHOD MAY HAVE THE SAME PROBLEM ───────
-- The trial row sets payment_method = 'trial'. If that column also
-- carries a CHECK, this widens it the same way.

do $$
declare cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'subscriptions'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%payment_method%';

  if cname is not null then
    execute format('alter table subscriptions drop constraint %I', cname);
    execute 'alter table subscriptions add constraint subscriptions_payment_method_check
             check (payment_method is null or payment_method in
               (''trial'',''razorpay'',''cash'',''upi'',''bank'',''manual'',''free''))';
  end if;
end $$;


-- ── PART 3 — NOW THE TRIAL ──────────────────────────────────

insert into subscriptions
  (student_id, plan, amount, status, starts_at, expires_at, payment_method, reference)
select
  u.id,
  'trial',
  0,
  'active',
  now(),
  timestamptz '2026-08-15 23:59:59+05:30',
  'trial',
  'Free trial to 15 Aug 2026'
from users u
where u.role = 'student'
  and u.is_active
  and not exists (
    select 1 from subscriptions s
    where s.student_id = u.id
      and s.status = 'active'
      and (s.expires_at is null or s.expires_at > now())
  );


-- ── PART 4 — CHECK IT ───────────────────────────────────────

select
  u.full_name,
  s.plan,
  s.amount,
  to_char(s.expires_at at time zone 'Asia/Kolkata', 'DD Mon YYYY HH24:MI') as ends
from subscriptions s
join users u on u.id = s.student_id
where s.status = 'active'
order by s.plan, u.full_name;

-- Nobody left without access — expect zero rows
select u.full_name
from users u
where u.role = 'student' and u.is_active
  and not exists (
    select 1 from subscriptions s
    where s.student_id = u.id and s.status = 'active'
      and (s.expires_at is null or s.expires_at > now())
  );
