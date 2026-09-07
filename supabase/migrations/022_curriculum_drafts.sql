-- ============================================================
-- iMathAcademy — Migration 022
-- Somewhere safe for curriculum drafts
--
-- The Vedic forms saved into the browser and downloaded a file.
-- That loses Megha's work if she changes device, clears her
-- browsing data, or simply forgets to send the file.
--
-- This is deliberately NOT the real curriculum schema. The answers
-- are kept as they are written, and the proper tables get designed
-- once we can see what she actually wrote. Guessing the schema
-- first is what cost us weeks on Abacus.
--
-- Safe to re-run.
-- ============================================================

create table if not exists curriculum_drafts (
  id           uuid primary key default gen_random_uuid(),

  program_code text not null default 'vedic',
  kind         text not null,          -- course | level | sutra
  ref          text,                   -- "3" for a level, the name for a sutra

  payload      jsonb not null,         -- exactly what she typed

  filled_by    uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One row per thing, so saving again edits rather than piles up
  constraint one_draft_per_thing unique (program_code, kind, ref)
);

create index if not exists idx_drafts_kind on curriculum_drafts (program_code, kind);

comment on table curriculum_drafts is
  'Curriculum described in the teacher''s own words, before it is turned into levels and rules. Raw on purpose.';
comment on column curriculum_drafts.payload is
  'Whatever the form collected. No shape is enforced — the shape is what we are trying to learn.';


-- ── WHO MAY WRITE ───────────────────────────────────────────
alter table curriculum_drafts enable row level security;

drop policy if exists drafts_staff_all on curriculum_drafts;
create policy drafts_staff_all on curriculum_drafts
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin')));


-- ── WHAT HAS BEEN FILLED IN SO FAR ──────────────────────────
select kind, ref,
       to_char(updated_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as last_saved,
       length(payload::text) as size
from curriculum_drafts
where program_code = 'vedic'
order by kind, ref;
