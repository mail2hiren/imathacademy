-- ============================================================
-- iMathAcademy — Migration 011
-- Close the wide-open policy on financial data
--
-- fees carries a policy "authenticated_all" with qual = true and
-- with_check = true, for ALL commands. That lets any signed-in
-- user read and modify every fee row in the school — a student
-- could list every family's fees, change the amounts, or mark
-- them paid.
--
-- Permissive policies combine with OR, so this one policy makes
-- every scoped policy beside it irrelevant.
--
-- Everything legitimate is already covered:
--   admin_all_fees      admins, all commands
--   fees_staff_all      teachers and admins, all commands
--   fees_parent_read    a parent reads their own children's
--   parent_child_fees   the same again (older duplicate)
--   fees_parent_pay     a parent settles their own children's
--   fees_student_read   a student reads their own
--   student_own_fees    the same again (older duplicate)
--
-- PART 0 is a read-only audit. Run it first and look at what it
-- finds before running PART 1.
-- ============================================================


-- ── PART 0 — WHERE ELSE IS THIS? ────────────────────────────
-- Any row here is a table where every signed-in user has full
-- access. Blanket policies like this are usually left over from
-- early development and applied to several tables at once.

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and qual::text = 'true'
  and cmd in ('ALL','UPDATE','DELETE','INSERT')
order by tablename, policyname;


-- ── PART 1 — REMOVE IT FROM THE MONEY TABLES ────────────────
-- Financial data first. Check PART 0 before widening this.

drop policy if exists authenticated_all on fees;

do $$
begin
  if exists (select 1 from pg_policies
             where schemaname='public' and tablename='subscriptions'
               and policyname='authenticated_all') then
    execute 'drop policy authenticated_all on subscriptions';
  end if;
end $$;


-- ── PART 2 — CONFIRM NOTHING LEGITIMATE BROKE ───────────────
-- fees should still have: admin and staff full access, parents
-- and students reading their own, parents able to pay.

select policyname, cmd,
       case when qual::text = 'true' then 'WIDE OPEN' else 'scoped' end as scope
from pg_policies
where schemaname = 'public' and tablename = 'fees'
order by cmd, policyname;


-- ── AFTER RUNNING ───────────────────────────────────────────
-- Check each of these still works:
--   · admin can see and edit every fee
--   · a parent sees only their own children's fees
--   · a parent can pay one
--   · a student sees only their own
--
-- The duplicate pairs (parent_child_fees / fees_parent_read and
-- student_own_fees / fees_student_read) are harmless — identical
-- rules under two names. Tidying them is optional and can wait.
-- ============================================================
