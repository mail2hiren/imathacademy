-- ============================================================
-- iMathAcademy — Migration 017
-- Who owns an enquiry, and who earns from a student
--
-- Enquiries have no owner today, so every one lands on Megha.
--
-- The revenue share is deliberately NOT settled here. The rates are
-- editable, reviewable, and effective-dated, because the numbers are
-- not final and will be looked at each quarter.
--
-- Three levels, each falling back to the next:
--   1. this student, this teacher   — an exception
--   2. this teacher                 — their usual rate
--   3. the academy default          — one row, changes everybody
--
-- So "move everyone to 70%" is one edit, not two hundred. And
-- because every rate is dated, changing it never rewrites what has
-- already been earned.
--
-- Safe to re-run.
-- ============================================================


-- ── AN ENQUIRY BELONGS TO SOMEONE ───────────────────────────
alter table enquiries add column if not exists assigned_to    uuid references users(id);
alter table enquiries add column if not exists assigned_at    timestamptz;
alter table enquiries add column if not exists source         text;
alter table enquiries add column if not exists first_reply_at timestamptz;
alter table enquiries add column if not exists notes          text;

comment on column enquiries.assigned_to is
  'The teacher working this enquiry. Null means nobody has picked it up.';
comment on column enquiries.first_reply_at is
  'Set when the teacher first opens WhatsApp from the enquiry — how enquiries going cold are spotted.';

create index if not exists idx_enquiries_assigned on enquiries (assigned_to, status);


-- ── LEVEL 3: THE ACADEMY DEFAULT ────────────────────────────
-- One row per period. Change the rate by ending the current row and
-- adding a new one, so last quarter's earnings stay as they were.
create table if not exists revenue_terms (
  id          uuid primary key default gen_random_uuid(),
  teacher_pct numeric(5,2) not null check (teacher_pct >= 0 and teacher_pct <= 100),
  starts_on   date not null default current_date,
  ends_on     date,
  note        text,
  set_by      uuid references users(id),
  created_at  timestamptz not null default now()
);

insert into revenue_terms (teacher_pct, starts_on, note)
select 65.00, current_date, 'Opening figure — not final, review each quarter'
where not exists (select 1 from revenue_terms);


-- ── LEVEL 2: A TEACHER'S OWN RATE ───────────────────────────
-- Only for a teacher on different terms. Null means the academy
-- default applies, so most teachers need no row at all.
create table if not exists teacher_terms (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references users(id) on delete cascade,
  teacher_pct numeric(5,2) check (teacher_pct >= 0 and teacher_pct <= 100),
  starts_on   date not null default current_date,
  ends_on     date,
  note        text,
  set_by      uuid references users(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_teacher_terms on teacher_terms (teacher_id, starts_on desc);


-- ── LEVEL 1: WHO EARNS FROM A STUDENT ───────────────────────
-- Kept apart from batches on purpose: a child can change batch, or
-- have a stand-in for a month, without the money moving.
-- share_pct is nullable — leave it empty and the teacher's rate or
-- the academy default applies.
create table if not exists student_teacher_share (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references users(id) on delete cascade,
  teacher_id  uuid not null references users(id),
  share_pct   numeric(5,2) check (share_pct >= 0 and share_pct <= 100),
  starts_on   date not null default current_date,
  ends_on     date,
  brought_by  uuid references users(id),   -- who found them, if not the teacher
  note        text,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now(),
  constraint one_share_at_a_time unique (student_id, starts_on)
);
create index if not exists idx_share_student on student_teacher_share (student_id, starts_on desc);
create index if not exists idx_share_teacher on student_teacher_share (teacher_id);

comment on column student_teacher_share.share_pct is
  'Leave empty unless this student is an exception — the teacher rate or academy default applies.';


-- ── WHAT RATE APPLIES, ON A GIVEN DAY ───────────────────────
create or replace function effective_share_pct(p_student uuid, p_on date default current_date)
returns numeric language sql stable as $$
  select coalesce(
    (select s.share_pct from student_teacher_share s
      where s.student_id = p_student and s.share_pct is not null
        and s.starts_on <= p_on and (s.ends_on is null or s.ends_on >= p_on)
      order by s.starts_on desc limit 1),
    (select t.teacher_pct from teacher_terms t
       join student_teacher_share s on s.teacher_id = t.teacher_id
      where s.student_id = p_student and t.teacher_pct is not null
        and t.starts_on <= p_on and (t.ends_on is null or t.ends_on >= p_on)
        and s.starts_on <= p_on and (s.ends_on is null or s.ends_on >= p_on)
      order by t.starts_on desc limit 1),
    (select r.teacher_pct from revenue_terms r
      where r.starts_on <= p_on and (r.ends_on is null or r.ends_on >= p_on)
      order by r.starts_on desc limit 1),
    65.00
  );
$$;


-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table enquiries enable row level security;

drop policy if exists enq_staff_read on enquiries;
create policy enq_staff_read on enquiries for select using (
  exists (select 1 from users u where u.id = auth.uid() and u.role in ('teacher','admin')));

drop policy if exists enq_own_write on enquiries;
create policy enq_own_write on enquiries for update using (
  assigned_to = auth.uid()
  or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  assigned_to = auth.uid()
  or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists enq_public_insert on enquiries;
create policy enq_public_insert on enquiries for insert with check (true);

-- Money terms are set by the academy, so teachers read but never write
do $$
declare t text;
begin
  foreach t in array array['revenue_terms','teacher_terms','student_teacher_share'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t||'_admin', t);
    execute format('create policy %I on %I for all using (exists (select 1 from users u where u.id = auth.uid() and u.role = ''admin'')) with check (exists (select 1 from users u where u.id = auth.uid() and u.role = ''admin''))', t||'_admin', t);
  end loop;
end $$;

drop policy if exists sts_teacher_read on student_teacher_share;
create policy sts_teacher_read on student_teacher_share
  for select using (teacher_id = auth.uid());

drop policy if exists tt_teacher_read on teacher_terms;
create policy tt_teacher_read on teacher_terms
  for select using (teacher_id = auth.uid());


-- ── RECORD WHO TEACHES WHOM, STARTING NOW ───────────────────
-- The facts, not the percentages. Whatever is agreed later can then
-- be applied fairly to history.
insert into student_teacher_share (student_id, teacher_id, starts_on, note)
select distinct bs.student_id, b.teacher_id, current_date,
       'Taken from the batch teacher when this was introduced'
from batch_students bs
join batches b on b.id = bs.batch_id
where b.teacher_id is not null
  and not exists (select 1 from student_teacher_share s where s.student_id = bs.student_id);


-- ── CHECK ───────────────────────────────────────────────────
select u.full_name as student, t.full_name as teacher,
       effective_share_pct(u.id) as pct_today
from student_teacher_share s
join users u on u.id = s.student_id
join users t on t.id = s.teacher_id
where s.ends_on is null
order by t.full_name, u.full_name;

-- Students nobody is recorded against
select u.full_name, u.email
from users u
where u.role = 'student' and u.is_active
  and not exists (select 1 from student_teacher_share s where s.student_id = u.id);

-- To change the rate for everybody later:
--   update revenue_terms set ends_on = current_date - 1 where ends_on is null;
--   insert into revenue_terms (teacher_pct, note)
--   values (70.00, 'Reviewed Q4 2026');
