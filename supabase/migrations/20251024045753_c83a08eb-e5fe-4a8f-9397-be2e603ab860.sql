-- Phase 2.4: Memory Summarization & Feedback Loop

-- Session-Zusammenfassungen
create table if not exists public.helpbot_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.helpbot_sessions(id) on delete cascade,
  summary text not null,
  lang text default 'de',
  tokens int default 0,
  created_at timestamp with time zone default now()
);

-- Feedback
create table if not exists public.helpbot_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.helpbot_messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating int check (rating in (-1,0,1)),
  comment text,
  created_at timestamp with time zone default now()
);

-- Indexe
create index if not exists idx_helpbot_summaries_session on public.helpbot_summaries(session_id);
create index if not exists idx_helpbot_feedback_message on public.helpbot_feedback(message_id);

-- RLS aktivieren
alter table public.helpbot_summaries enable row level security;
alter table public.helpbot_feedback enable row level security;

-- RLS Policies
create policy "read_own_summaries" on public.helpbot_summaries for select 
using (
  session_id in (
    select id from public.helpbot_sessions where user_id = auth.uid() or user_id is null
  )
);

create policy "read_own_feedback" on public.helpbot_feedback for select 
using (auth.uid() = user_id or user_id is null);

create policy "insert_own_feedback" on public.helpbot_feedback for insert 
with check (auth.uid() = user_id or user_id is null);

-- RPC Function für Relevanz-Anpassung
create or replace function public.adjust_relevance(p_message_id uuid, p_delta numeric)
returns void as $$
begin
  update public.helpbot_messages
  set relevance = least(greatest(relevance + p_delta, 0), 1)
  where id = p_message_id;
end;
$$ language plpgsql security definer;