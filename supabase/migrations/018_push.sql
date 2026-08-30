-- ============================================================
-- iMathAcademy — Migration 018
-- Push notifications for enquiries
--
-- A parent enquiring at 11pm should not wait until Thursday for a
-- reply. wa.me cannot ping anybody by itself, so this is the piece
-- that actually reaches a phone.
--
-- Safe to re-run.
-- ============================================================

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null unique,     -- the browser's own address for this device
  p256dh      text not null,
  auth        text not null,
  device      text,                     -- so a person can tell their phone from their laptop
  created_at  timestamptz not null default now(),
  last_used   timestamptz
);

create index if not exists idx_push_user on push_subscriptions (user_id);

comment on table push_subscriptions is
  'One row per device that has agreed to notifications. A person may have several.';

alter table push_subscriptions enable row level security;

-- A person manages their own devices; nobody else sees them
drop policy if exists push_own on push_subscriptions;
create policy push_own on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The sending function uses the service key, which bypasses this


-- ── WHO IS TOLD ABOUT WHAT ──────────────────────────────────
alter table users add column if not exists notify_enquiries boolean default true;

comment on column users.notify_enquiries is
  'Off for anyone who would rather not be interrupted. On by default.';


-- ── CHECK ───────────────────────────────────────────────────
select u.full_name, u.role, count(p.id) as devices
from users u
left join push_subscriptions p on p.user_id = u.id
where u.role in ('teacher','admin')
group by u.id, u.full_name, u.role
order by u.full_name;
