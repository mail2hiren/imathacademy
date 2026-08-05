-- ============================================================
-- iMathAcademy — Migration 012
-- Free trial for everyone until 15 August 2026
--
-- Done as data, not code. Every student gets a real subscription
-- row marked as a trial, so every existing check just works —
-- the login guard, the parent portal, the admin list. Nothing
-- needs switching back on 16 August: the rows simply expire.
--
-- PART 0 is read-only. Run it and look before running PART 1.
-- ============================================================


-- ── PART 0 — WHO WOULD THIS AFFECT? ─────────────────────────

select
  count(*) filter (where u.role = 'student' and u.is_active)               as active_students,
  count(*) filter (where u.role = 'student' and u.is_active and s.id is null) as would_get_trial,
  count(*) filter (where u.role = 'student' and s.id is not null)          as already_subscribed
from users u
left join subscriptions s
  on s.student_id = u.id
 and s.status = 'active'
 and (s.expires_at is null or s.expires_at > now());

-- Anyone already paying, so we do not disturb them
select u.full_name, s.plan, s.amount, s.expires_at
from subscriptions s
join users u on u.id = s.student_id
where s.status = 'active'
  and (s.expires_at is null or s.expires_at > now())
order by s.expires_at;


-- ── PART 1 — GIVE EVERY STUDENT THE TRIAL ───────────────────
-- Only students who do not already have live access. A parent who
-- has paid keeps exactly what they paid for.

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


-- ── PART 2 — EXTEND ANY TRIAL THAT ENDS TOO SOON ────────────
-- If a shorter trial was already given, stretch it to the same date
-- rather than leaving two different endings in play.

update subscriptions
   set expires_at = timestamptz '2026-08-15 23:59:59+05:30'
 where plan = 'trial'
   and status = 'active'
   and expires_at < timestamptz '2026-08-15 23:59:59+05:30';


-- ── PART 3 — CHECK IT ───────────────────────────────────────

select
  u.full_name,
  s.plan,
  s.amount,
  s.status,
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


-- ── AFTER 15 AUGUST ─────────────────────────────────────────
-- Nothing to undo. The rows expire on their own and every student
-- without a paid subscription loses access the same evening.
--
-- To see who has not converted, on 16 August:
--
--   select u.full_name, u.email
--   from users u
--   join subscriptions s on s.student_id = u.id and s.plan = 'trial'
--   where u.role = 'student' and u.is_active
--     and not exists (
--       select 1 from subscriptions s2
--       where s2.student_id = u.id and s2.plan <> 'trial'
--         and s2.status = 'active' and s2.expires_at > now());
--
-- To extend the trial instead, re-run PART 2 with a later date.
-- ============================================================
