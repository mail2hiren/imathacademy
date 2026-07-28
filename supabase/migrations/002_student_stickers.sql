-- ============================================================
-- iMathAcademy — Migration 002
-- Sticker collection for Tiny Champs (and Rising Stars)
--
-- Stickers are deliberately NOT badges.
--   badges   rare, one of each, achievement-based
--   stickers frequent, duplicates welcome, collection-based
--
-- A five-year-old is motivated by "I have eleven and I want
-- twelve", not by an abstract XP number. Duplicates are a
-- feature: children like having three of the same one.
-- ============================================================


-- ── PART 1 — TABLE ──────────────────────────────────────────

create table if not exists student_stickers (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references users(id) on delete cascade,

  -- matches a key in STICKER_DEFS (portal/js/student-stickers.js)
  sticker_key  text not null,

  -- what the child did to earn it
  source       text not null default 'worksheet'
               check (source in ('worksheet','streak','quiz','levelup','bonus')),

  -- What it was earned for. For a worksheet this is the worksheet id,
  -- which is what enforces "one sticker per worksheet" — a child cannot
  -- redo the same sheet to farm stickers.
  ref_id       uuid,

  earned_at    timestamptz not null default now()
);

-- Duplicate sticker *kinds* are intentional — three cats is fine.
-- But the same worksheet must never pay out twice.
create unique index if not exists uq_sticker_per_worksheet
  on student_stickers (student_id, ref_id)
  where ref_id is not null;

create index if not exists idx_stickers_student
  on student_stickers (student_id, earned_at desc);

-- Supports the "one streak sticker per day" check
create index if not exists idx_stickers_source_day
  on student_stickers (student_id, source, earned_at desc);

comment on table student_stickers is
  'Collectible stickers. Duplicates are intentional — the collection growing is the motivator, not scarcity.';


-- ── PART 2 — ROW LEVEL SECURITY ─────────────────────────────

alter table student_stickers enable row level security;

-- A child sees their own collection
drop policy if exists stickers_student_read on student_stickers;
create policy stickers_student_read on student_stickers
  for select using (student_id = auth.uid());

-- A child earns their own stickers in the app
drop policy if exists stickers_student_insert on student_stickers;
create policy stickers_student_insert on student_stickers
  for insert with check (student_id = auth.uid());

-- Parents see their children's collection
drop policy if exists stickers_parent_read on student_stickers;
create policy stickers_parent_read on student_stickers
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = student_stickers.student_id
        and ps.parent_id  = auth.uid()
    )
  );

-- Teachers and admins see everything, and can award a bonus sticker
drop policy if exists stickers_staff_all on student_stickers;
create policy stickers_staff_all on student_stickers
  for all using (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  ) with check (
    exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin'))
  );


-- ── PART 3 — VERIFY ─────────────────────────────────────────

-- Should return the empty table without error
select count(*) as sticker_count from student_stickers;

-- Collection summary once children start earning
-- select u.full_name, s.sticker_key, count(*) as copies
-- from student_stickers s
-- join users u on u.id = s.student_id
-- group by u.full_name, s.sticker_key
-- order by u.full_name, copies desc;
