-- ============================================================
-- iMathAcademy — Migration 004
-- Per-worksheet abacus control
--
-- The level sets the default. A single worksheet can override it,
-- so Megha can set a Big Friends sheet on the abacus and a speed
-- drill without one, at the same level, in the same week.
--
-- Specific beats general: worksheet override, then level rule.
--
-- Safe to re-run.
-- ============================================================

alter table lx_worksheets
  add column if not exists abacus_mode text;

alter table lx_worksheets drop constraint if exists lx_worksheets_abacus_mode_check;
alter table lx_worksheets add  constraint lx_worksheets_abacus_mode_check
  check (abacus_mode is null or abacus_mode in ('default','required','optional','mental'));

comment on column lx_worksheets.abacus_mode is
  'Overrides the level setting for this worksheet only. null or "default" follows curriculum_levels.physical_abacus. "mental" means no abacus — an Anzan drill.';

-- Existing worksheets follow their level, which is what they did before
update lx_worksheets set abacus_mode = 'default' where abacus_mode is null;

select coalesce(abacus_mode,'(null)') as mode, count(*)
from lx_worksheets group by 1 order by 1;
