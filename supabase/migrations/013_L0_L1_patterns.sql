-- ============================================================
-- iMathAcademy — Migration 013
-- Two-digit work at L0 and L1
--
-- curriculum_row_rules lists only the single-digit pattern for L0
-- and L1. But L0 allows two digits up to 99, and Megha's own L0
-- examples are two-digit: 11+23, 52+47, 44-23, 63-50, 99-76.
--
-- It matters more than it looks. With single digits and no
-- complement formula, a running total can never pass 9 — going from
-- 9 to 10 needs the ten bead, which IS Big Friends. So a Level 0
-- page could only ever have nine possible answers, and Megha asks
-- that every answer on a page be different.
--
-- Safe to re-run.
-- ============================================================

insert into curriculum_row_rules (level_code, digit_pattern, min_rows, max_rows, sort_order)
values
  -- L0: single digits first, then two-digit work, all direct movement
  ('L0','2d+1d', 3, 4, 2),
  ('L0','2d+2d', 3, 4, 3),

  -- L1: the complements arrive, so columns can run longer
  ('L1','2d+1d', 4, 5, 2),
  ('L1','2d+2d', 3, 4, 3)
on conflict (level_code, digit_pattern) do nothing;


-- ── CHECK ───────────────────────────────────────────────────
select level_code, digit_pattern, min_rows || '–' || max_rows as rows, sort_order
from curriculum_row_rules
where level_code in ('L0','L1')
order by level_code, sort_order;

-- And the ranges these patterns must fit inside
select level_code, level_name, min_digits, max_digits, min_number, max_number,
       min_rows, max_rows, guardrail_notes
from curriculum_levels
where level_code in ('L0','L1')
order by level_code;
