-- ============================================================
-- Which stored worksheets would break Megha's L0 and L1 rules?
--
-- Worksheets keep the questions that existed when they were made.
-- Everything created before this week came from the AI or from the
-- old generator, neither of which knew what a bead can do. Fixing
-- the generator does not touch them — a child opening an old
-- worksheet still meets the old sums.
--
-- Run PART 1, look at the list, then decide.
-- ============================================================


-- ── PART 1 — WHAT IS OUT THERE ──────────────────────────────

select
  w.level_code,
  w.title,
  w.concept,
  w.activity,
  case
    when w.created_at < timestamptz '2026-08-09' then 'made before the bead rules existed'
    else 'made with the current generator'
  end as vintage,
  b.name as batch,
  u.full_name as student,
  w.created_at::date as made
from lx_worksheets w
left join batches b on b.id = w.batch_id
left join users   u on u.id = w.student_id
where w.level_code in ('L0','L1')
  and w.is_active
order by w.level_code, w.created_at desc;


-- ── PART 2 — HOW MANY, AND OF WHAT KIND ─────────────────────
-- The AI activities are the ones that produced word problems about
-- superheroes rather than abacus work.

select
  level_code,
  activity,
  count(*) as worksheets,
  min(created_at::date) as oldest,
  max(created_at::date) as newest
from lx_worksheets
where level_code in ('L0','L1') and is_active
group by level_code, activity
order by level_code, count(*) desc;


-- ── PART 3 — RETIRE THE OLD ONES ────────────────────────────
-- Nothing is deleted: is_active = false simply stops them being
-- served, and they can be brought back by setting it true again.
--
-- Only run this once Megha has replacements ready, or children will
-- open their worksheet list and find it empty.
--
-- update lx_worksheets
--    set is_active = false
--  where level_code in ('L0','L1')
--    and created_at < timestamptz '2026-08-09'
--    and is_active;


-- ── PART 4 — WHAT CHILDREN WOULD LOSE ───────────────────────
-- Run this before PART 3 so the scale is clear.

select
  w.level_code,
  count(distinct w.id)          as worksheets_retired,
  count(distinct r.student_id)  as children_who_had_started
from lx_worksheets w
left join worksheet_responses r on r.worksheet_id = w.id
where w.level_code in ('L0','L1')
  and w.created_at < timestamptz '2026-08-09'
  and w.is_active
group by w.level_code;
