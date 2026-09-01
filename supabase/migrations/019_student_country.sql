-- ============================================================
-- iMathAcademy — Migration 019
-- Which country a student is in
--
-- Fees are already configured per country in pricing_plans, and
-- Razorpay is set up to take foreign currency. But nothing records
-- where a student actually is, so everyone is billed in rupees.
--
-- Safe to re-run.
-- ============================================================

alter table users add column if not exists country_code text default 'IN';

comment on column users.country_code is
  'Two-letter code. Decides which pricing_plans rows apply and which currency they are billed in.';

-- Anyone already here is in India unless told otherwise
update users set country_code = 'IN'
where country_code is null and role = 'student';

create index if not exists idx_users_country on users (country_code);


-- ── WHICH COUNTRIES ARE PRICED? ─────────────────────────────
-- A student in a country with no pricing row has nothing to be
-- charged, so this is worth reading before adding families abroad.
select country_code,
       count(*) as plans,
       string_agg(plan_code || ' ' || amount, ', ' order by duration_days) as prices
from pricing_plans
where is_active is not false
group by country_code
order by country_code;


-- ── WHERE THE STUDENTS ARE ──────────────────────────────────
select coalesce(u.country_code, '(not set)') as country,
       count(*) as students,
       count(*) filter (
         where not exists (
           select 1 from pricing_plans p
           where p.country_code = u.country_code and p.is_active is not false)
       ) as with_no_pricing
from users u
where u.role = 'student' and u.is_active
group by u.country_code
order by count(*) desc;
