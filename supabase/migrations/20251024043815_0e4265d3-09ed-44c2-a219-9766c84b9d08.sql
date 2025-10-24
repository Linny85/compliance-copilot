-- Chat-Sitzungen (eine pro Benutzer oder Thema)
create table if not exists public.helpbot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  last_activity timestamptz default now(),
  lang text default 'de',
  jurisdiction text default 'EU'
);

-- Verlauf innerhalb einer Session
create table if not exists public.helpbot_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.helpbot_sessions(id) on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz default now()
);

-- Indexe
create index if not exists idx_helpbot_messages_session on helpbot_messages(session_id);
create index if not exists idx_helpbot_sessions_user on helpbot_sessions(user_id);
create index if not exists idx_helpbot_sessions_activity on helpbot_sessions(last_activity);

-- RLS aktivieren
alter table public.helpbot_sessions enable row level security;
alter table public.helpbot_messages enable row level security;

-- Policies für Sessions
create policy "users_see_their_sessions"
on public.helpbot_sessions for all
using (auth.uid() = user_id or user_id is null)
with check (auth.uid() = user_id or user_id is null);

-- Policies für Messages
create policy "users_see_their_messages"
on public.helpbot_messages for all
using (
  session_id in (
    select id from helpbot_sessions 
    where user_id = auth.uid() or user_id is null
  )
)
with check (
  session_id in (
    select id from helpbot_sessions 
    where user_id = auth.uid() or user_id is null
  )
);