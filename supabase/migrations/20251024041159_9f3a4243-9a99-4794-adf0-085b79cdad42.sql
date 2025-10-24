-- Enable pgvector extension
create extension if not exists vector;

-- Storage bucket for help sources
insert into storage.buckets (id, name, public)
values ('helpbot-sources', 'helpbot-sources', false)
on conflict (id) do nothing;

-- Document metadata table
create table if not exists public.helpbot_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_uri text not null,
  jurisdiction text,
  doc_type text check (doc_type in ('law', 'guideline', 'product-doc')) default 'product-doc',
  version text,
  lang text default 'de',
  created_at timestamptz default now()
);

-- Content chunks with embeddings (OpenAI text-embedding-3-small → 1536 dimensions)
create table if not exists public.helpbot_chunks (
  id bigserial primary key,
  doc_id uuid not null references public.helpbot_docs(id) on delete cascade,
  chunk_no int not null,
  content text not null,
  tokens int,
  embedding vector(1536)
);

-- Indexes for performance
create index if not exists idx_helpbot_chunks_doc on public.helpbot_chunks(doc_id);
create index if not exists idx_helpbot_docs_lang on public.helpbot_docs(lang);
create index if not exists idx_helpbot_chunks_ivf on public.helpbot_chunks 
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RPC function for efficient similarity search with filters
create or replace function public.helpbot_search_chunks(
  query_vec vector,
  limit_k int default 6,
  where_sql text default ''
)
returns table (
  doc_id uuid,
  title text,
  source_uri text,
  content text,
  sim float4
)
language plpgsql stable as $$
declare 
  sql_query text;
begin
  sql_query := '
    select d.id as doc_id, d.title, d.source_uri, c.content,
           (c.embedding <=> $1)::float4 as sim
    from public.helpbot_chunks c
    join public.helpbot_docs d on d.id = c.doc_id
    ' || where_sql || '
    order by c.embedding <=> $1
    limit $2
  ';
  return query execute sql_query using query_vec, limit_k;
end $$;

-- Enable RLS (read-only for authenticated users, service role for writes)
alter table public.helpbot_docs enable row level security;
alter table public.helpbot_chunks enable row level security;

create policy "helpbot_docs_read" on public.helpbot_docs for select using (true);
create policy "helpbot_chunks_read" on public.helpbot_chunks for select using (true);

-- Storage policy for helpbot sources (service role only)
create policy "Service role can manage helpbot sources"
on storage.objects for all
using (bucket_id = 'helpbot-sources' and auth.role() = 'service_role');