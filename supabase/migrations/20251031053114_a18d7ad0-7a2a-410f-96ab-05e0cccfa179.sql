-- NORRLY Memory System: User-specific conversation context per module & locale

-- 1) Create helpbot_memory table
create table if not exists public.helpbot_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module text not null,
  locale text not null,
  messages jsonb not null default '[]'::jsonb,
  token_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- Unique constraint: one memory per user × module × locale
create unique index if not exists ux_helpbot_memory_user_module_locale
  on public.helpbot_memory (user_id, module, locale);

-- 2) Enable RLS
alter table public.helpbot_memory enable row level security;

-- 3) RLS Policies (users can only see and manage their own memory)
create policy helpbot_memory_select_own
  on public.helpbot_memory
  for select
  using (user_id = auth.uid());

create policy helpbot_memory_insert_own
  on public.helpbot_memory
  for insert
  with check (user_id = auth.uid());

create policy helpbot_memory_update_own
  on public.helpbot_memory
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());