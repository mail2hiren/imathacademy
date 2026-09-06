-- ============================================================
-- Half-finished signups
--
-- Enrolment does several things in a row: create the login, write
-- the student profile, create a parent row, link the two. A failure
-- part-way leaves some of it done. The worst state is a login with
-- no profile — the person cannot sign up again ("already
-- registered") and cannot sign in either (nothing to load).
--
-- PART 1 shows the truth. PART 2 fixes each case.
-- Nothing here deletes anything until you choose to.
-- ============================================================


-- ── 1a. LOGINS WITH NO PROFILE ──────────────────────────────
-- These people are stuck: signing up again is refused, signing in
-- goes nowhere.
select au.id, au.email,
       au.created_at,
       au.raw_user_meta_data->>'full_name' as name_given,
       au.raw_user_meta_data->>'role'      as role_given,
       'LOGIN WITH NO PROFILE' as problem
from auth.users au
where not exists (select 1 from public.users u where u.id = au.id)
order by au.created_at desc;


-- ── 1b. PROFILES WITH NO LOGIN ──────────────────────────────
-- Usually the fake ".parent" rows. Harmless but they cannot sign in.
select u.id, u.full_name, u.email, u.role, u.created_at,
       'PROFILE WITH NO LOGIN' as problem
from public.users u
where not exists (select 1 from auth.users au where au.id = u.id)
order by u.created_at desc;


-- ── 1c. PARENTS LINKED TO NOBODY ────────────────────────────
select u.id, u.full_name, u.email, u.created_at,
       'PARENT LINKED TO NO CHILD' as problem
from public.users u
where u.role = 'parent'
  and not exists (select 1 from parent_students ps where ps.parent_id = u.id)
order by u.created_at desc;


-- ── 1d. ONE PERSON, END TO END ──────────────────────────────
-- Change the email and run this to see exactly where they stand.
select
  (select count(*) from auth.users     where email ilike 'truptireddy2186@gmail.com')            as has_login,
  (select count(*) from public.users   where email ilike 'truptireddy2186@gmail.com')            as has_profile,
  (select count(*) from public.users   where email ilike 'truptireddy2186@gmail.com.parent')     as has_parent_row,
  (select count(*) from parent_students ps
     join public.users u on u.id = ps.parent_id
    where u.email ilike 'truptireddy2186@gmail.com.parent')                                      as is_linked,
  (select count(*) from subscriptions s
     join public.users u on u.id = s.student_id
    where u.email ilike 'truptireddy2186@gmail.com')                                             as has_subscription;


-- ============================================================
-- PART 2 — PUTTING IT RIGHT
-- Pick the case that matches. Read before running.
-- ============================================================

-- ── CASE A: login exists, profile missing ───────────────────
-- Preferred. Keeps the login they created, so their password still
-- works and they do not have to sign up again.
/*
insert into public.users (id, email, full_name, role, program, is_active, country_code, created_at)
select au.id,
       au.email,
       coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email,'@',1)),
       coalesce(au.raw_user_meta_data->>'role', 'student'),
       coalesce(au.raw_user_meta_data->>'program', 'abacus'),
       true,
       'IN',
       au.created_at
from auth.users au
where au.email ilike 'truptireddy2186@gmail.com'
  and not exists (select 1 from public.users u where u.id = au.id);
*/

-- ── CASE B: let them start over instead ─────────────────────
-- Only if CASE A is not wanted. The login must be removed from
-- Authentication → Users in the dashboard; SQL cannot delete it
-- safely. Remove the leftovers here FIRST, then delete the login.
/*
delete from parent_students
where parent_id in (select id from public.users
                    where email ilike 'truptireddy2186@gmail.com.parent')
   or student_id in (select id from public.users
                     where email ilike 'truptireddy2186@gmail.com');

delete from public.users
where email ilike 'truptireddy2186@gmail.com.parent';

-- then: Authentication → Users → find the email → Delete user
*/

-- ── CASE C: the orphan parent row only ──────────────────────
-- Safe on its own: it has no login, so nothing is being taken away.
/*
delete from public.users u
where u.role = 'parent'
  and not exists (select 1 from auth.users au where au.id = u.id)
  and not exists (select 1 from parent_students ps where ps.parent_id = u.id);
*/


-- ── 3. CHECK ────────────────────────────────────────────────
select
  (select count(*) from auth.users au
     where not exists (select 1 from public.users u where u.id = au.id))  as logins_without_profile,
  (select count(*) from public.users u
     where u.role <> 'parent'
       and not exists (select 1 from auth.users au where au.id = u.id))   as profiles_without_login;
-- Both should be zero.
