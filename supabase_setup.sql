-- ============================================================
--  Lumina Life OS — Complete Supabase Database Setup Script
--  Author : Burak Kaygusuzoglu
--  Run    : Supabase Dashboard → SQL Editor → paste & Run
--  Safe   : fully idempotent (DROP IF EXISTS + CREATE IF NOT EXISTS)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- ILIKE index support for text search

-- ============================================================
--  STEP 1 — Drop existing tables  (reverse FK dependency order)
--  Skipped if running for the first time; safe to re-run.
-- ============================================================
drop table if exists public.insights          cascade;
drop table if exists public.time_capsules     cascade;
drop table if exists public.exercise_logs     cascade;
drop table if exists public.health_appointments cascade;
drop table if exists public.sleep_entries     cascade;
drop table if exists public.mood_entries      cascade;
drop table if exists public.vault_items       cascade;
drop table if exists public.tasks             cascade;
drop table if exists public.memories          cascade;

-- ============================================================
--  STEP 2 — Shared trigger: auto-update updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
--  TABLE 1 — memories
--  Used by: Mind module (notes/ideas/etc.) + Journal (entries)
-- ============================================================
create table public.memories (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  title        text,
  content      text        not null,
  memory_type  text        not null default 'note'
                           check (memory_type in (
                             'note','idea','voice','journal',
                             'wellness','task','experience',
                             'dream','goal','gratitude'
                           )),
  tags         text[]      not null default '{}',
  metadata     jsonb       not null default '{}',
  is_pinned    boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_memories_user_id    on public.memories(user_id);
create index idx_memories_type       on public.memories(memory_type);
create index idx_memories_created    on public.memories(created_at desc);
create index idx_memories_pinned     on public.memories(user_id, is_pinned) where is_pinned = true;
create index idx_memories_content_trgm on public.memories using gin (content gin_trgm_ops);

create trigger trg_memories_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

-- ============================================================
--  TABLE 2 — tasks
--  Used by: Life module
-- ============================================================
create table public.tasks (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  title            text        not null check (char_length(title) >= 1 and char_length(title) <= 255),
  description      text,
  priority         text        not null default 'medium'
                               check (priority in ('low','medium','high','critical')),
  status           text        not null default 'todo'
                               check (status in ('todo','in_progress','done','cancelled')),
  due_date         timestamptz,
  completed_at     timestamptz,
  tags             text[]      not null default '{}',
  is_recurring     boolean     not null default false,
  recurrence_rule  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_tasks_user_id   on public.tasks(user_id);
create index idx_tasks_status    on public.tasks(user_id, status);
create index idx_tasks_due_date  on public.tasks(due_date) where due_date is not null;
create index idx_tasks_created   on public.tasks(created_at desc);

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
--  TABLE 3 — mood_entries
--  Used by: Wellness module
-- ============================================================
create table public.mood_entries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  mood_score  integer     not null check (mood_score >= 1 and mood_score <= 10),
  note        text        check (char_length(note) <= 500),
  tags        text[]      not null default '{}',
  created_at  timestamptz not null default now()
);

create index idx_mood_user_id  on public.mood_entries(user_id);
create index idx_mood_created  on public.mood_entries(created_at desc);

-- ============================================================
--  TABLE 4 — sleep_entries
--  Used by: Wellness module
-- ============================================================
create table public.sleep_entries (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  hours_slept  numeric(4,2) not null check (hours_slept >= 0 and hours_slept <= 24),
  quality      integer     not null check (quality >= 1 and quality <= 10),
  notes        text        check (char_length(notes) <= 500),
  created_at   timestamptz not null default now()
);

create index idx_sleep_user_id  on public.sleep_entries(user_id);
create index idx_sleep_created  on public.sleep_entries(created_at desc);

-- ============================================================
--  TABLE 5 — health_appointments
--  Used by: Wellness module
-- ============================================================
create table public.health_appointments (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null check (char_length(title) <= 255),
  doctor      text        check (char_length(doctor) <= 120),
  date        text        not null,   -- YYYY-MM-DD stored as text (API contract)
  time        text        not null,   -- HH:MM stored as text (API contract)
  notes       text        check (char_length(notes) <= 1000),
  created_at  timestamptz not null default now()
);

create index idx_appointments_user_id on public.health_appointments(user_id);
create index idx_appointments_date    on public.health_appointments(date);

-- ============================================================
--  TABLE 6 — exercise_logs
--  Used by: Wellness module (fitness tab)
-- ============================================================
create table public.exercise_logs (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  exercise_type     text        not null,
  duration_minutes  integer     not null check (duration_minutes > 0),
  calories_burned   integer     check (calories_burned >= 0),
  notes             text,
  recorded_at       timestamptz not null default now()
);

create index idx_exercise_user_id   on public.exercise_logs(user_id);
create index idx_exercise_recorded  on public.exercise_logs(recorded_at desc);

-- ============================================================
--  TABLE 7 — vault_items
--  Used by: Vault module (AES-256 encrypted secrets)
--  NOTE: password_encrypted and notes_encrypted store
--        AES-256-GCM ciphertext — never store plaintext here.
-- ============================================================
create table public.vault_items (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  name                text        not null check (char_length(name) >= 1 and char_length(name) <= 255),
  item_type           text        not null default 'password'
                                  check (item_type in ('password','note','card','document')),
  username            text,
  url                 text        check (char_length(url) <= 2048),
  password_encrypted  text,        -- AES-256 ciphertext
  notes_encrypted     text,        -- AES-256 ciphertext (content + card fields packed as JSON)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_vault_user_id  on public.vault_items(user_id);
create index idx_vault_type     on public.vault_items(user_id, item_type);
create index idx_vault_created  on public.vault_items(created_at desc);

create trigger trg_vault_updated_at
  before update on public.vault_items
  for each row execute function public.set_updated_at();

-- ============================================================
--  TABLE 8 — insights
--  Used by: AI Core — stores generated weekly reports,
--           mood pattern alerts, productivity analyses etc.
-- ============================================================
create table public.insights (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  insight_type  text        not null
                            check (insight_type in (
                              'weekly_report','mood_pattern','productivity',
                              'sleep_quality','growth','alert','greeting'
                            )),
  title         text        not null,
  content       text        not null,
  data_snapshot jsonb       not null default '{}',
  generated_at  timestamptz not null default now()
);

create index idx_insights_user_id  on public.insights(user_id);
create index idx_insights_type     on public.insights(insight_type);
create index idx_insights_gen      on public.insights(generated_at desc);

-- ============================================================
--  TABLE 9 — time_capsules
--  Used by: Journal module (Letters to future self)
-- ============================================================
create table public.time_capsules (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  title             text        not null check (char_length(title) <= 255),
  letter_encrypted  text,        -- Letter content (plaintext for now, encrypt later)
  open_date         timestamptz not null,
  is_opened         boolean     not null default false,
  ai_response       text,        -- AI-generated response on reveal
  tags              text[]      not null default '{}',
  created_at        timestamptz not null default now()
);

create index idx_capsules_user_id   on public.time_capsules(user_id);
create index idx_capsules_open_date on public.time_capsules(open_date);

-- ============================================================
--  STEP 3 — Row Level Security (RLS)
--  Every user can ONLY access their own rows.
--  Backend uses service_role key which bypasses RLS —
--  these policies protect direct Supabase client access.
-- ============================================================

alter table public.memories             enable row level security;
alter table public.tasks                enable row level security;
alter table public.mood_entries         enable row level security;
alter table public.sleep_entries        enable row level security;
alter table public.health_appointments  enable row level security;
alter table public.exercise_logs        enable row level security;
alter table public.vault_items          enable row level security;
alter table public.insights             enable row level security;
alter table public.time_capsules        enable row level security;

-- ── memories ─────────────────────────────────────────────────────────────────
create policy "memories: owner full access"
  on public.memories for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── tasks ────────────────────────────────────────────────────────────────────
create policy "tasks: owner full access"
  on public.tasks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── mood_entries ──────────────────────────────────────────────────────────────
create policy "mood_entries: owner full access"
  on public.mood_entries for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── sleep_entries ─────────────────────────────────────────────────────────────
create policy "sleep_entries: owner full access"
  on public.sleep_entries for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── health_appointments ───────────────────────────────────────────────────────
create policy "health_appointments: owner full access"
  on public.health_appointments for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── exercise_logs ─────────────────────────────────────────────────────────────
create policy "exercise_logs: owner full access"
  on public.exercise_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── vault_items ───────────────────────────────────────────────────────────────
create policy "vault_items: owner full access"
  on public.vault_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── insights ──────────────────────────────────────────────────────────────────
create policy "insights: owner full access"
  on public.insights for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── time_capsules ─────────────────────────────────────────────────────────────
create policy "time_capsules: owner full access"
  on public.time_capsules for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
--  STEP 4 — Verification query
--  Run this after setup to confirm all 9 tables exist.
-- ============================================================
select
  table_name,
  (select count(*) from information_schema.columns c where c.table_name = t.table_name and c.table_schema = 'public') as column_count
from information_schema.tables t
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'memories','tasks','mood_entries','sleep_entries',
    'health_appointments','exercise_logs','vault_items',
    'insights','time_capsules'
  )
order by table_name;

-- ============================================================
--  SETUP COMPLETE
--  Expected output: 9 rows, one per table.
-- ============================================================
