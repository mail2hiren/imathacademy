-- ============================================================
-- iMathAcademy — Migration 007
-- Stickers for solving a puzzle
--
-- Tiny Champs have no XP bar by design — a number means little at
-- five — so stickers are their only visible reward. But stickers
-- only came from worksheets, which meant practice and puzzles
-- looked like nothing had happened.
--
-- A puzzle is already earned: five practice questions right in a
-- row. So it is a safe thing to reward, unlike open practice.
--
-- Safe to re-run.
-- ============================================================

alter table student_stickers drop constraint if exists student_stickers_source_check;
alter table student_stickers add  constraint student_stickers_source_check
  check (source in ('worksheet','streak','puzzle','quiz','levelup','bonus'));

select coalesce(source,'(null)') as source, count(*)
from student_stickers group by 1 order by 1;
