-- ============================================================
-- iMathAcademy — Migration 006
-- Guardrails actually get stored
--
-- The Guardrails tab in the curriculum admin was a mockup: three
-- toggles hardcoded to true, a notes box nothing read, and a save
-- button whose only action was to show "Guardrails saved!".
--
-- Nothing was ever written, so nothing could ever come back.
--
-- Safe to re-run.
-- ============================================================

alter table curriculum_levels
  add column if not exists guard_max_number boolean not null default true;

alter table curriculum_levels
  add column if not exists guard_no_future_concepts boolean not null default true;

alter table curriculum_levels
  add column if not exists guard_allowed_ops_only boolean not null default true;

alter table curriculum_levels
  add column if not exists guardrail_notes text;

comment on column curriculum_levels.guardrail_notes is
  'Megha''s own rules for this level, in her words. Passed verbatim to the AI when generating worksheets, so it constrains what gets produced.';

select level_code, guard_max_number, guard_no_future_concepts,
       guard_allowed_ops_only,
       coalesce(left(guardrail_notes, 40), '(none)') as notes
from curriculum_levels
order by level_code;
