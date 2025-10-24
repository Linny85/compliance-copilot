-- Add relevance & embedding to messages for semantic scoring
alter table public.helpbot_messages
add column if not exists relevance numeric default 1.0 check (relevance >= 0 and relevance <= 1),
add column if not exists embedding vector(1536);

-- Index for semantic similarity queries
create index if not exists idx_helpbot_messages_embedding 
on helpbot_messages using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Index for session-based relevance queries
create index if not exists idx_helpbot_messages_session_relevance 
on helpbot_messages(session_id, relevance desc);