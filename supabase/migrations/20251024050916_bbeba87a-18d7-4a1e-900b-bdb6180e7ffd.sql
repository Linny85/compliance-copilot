-- Phase 2.6: Graph-Aware RAG & Context Regeneration

-- RPC: holt Kontext aus semantischem Graph
create or replace function public.get_graph_context(p_entity_labels text[], p_limit int)
returns table(entity text, type text, relation text, neighbor text, weight numeric, lang text)
language sql as $$
  select
    e1.label as entity,
    e1.type,
    r.relation,
    e2.label as neighbor,
    r.weight,
    e2.lang
  from public.helpbot_entities e1
  join public.helpbot_relations r on e1.id = r.source
  join public.helpbot_entities e2 on e2.id = r.target
  where e1.label = any(p_entity_labels)
  order by r.weight desc
  limit p_limit;
$$;

-- RPC: findet ähnliche Entitäten per Embedding
create or replace function public.match_helpbot_entities(query_vec vector(1536), match_count int default 5)
returns table(id uuid, label text, type text, lang text, description text, similarity float)
language sql stable as $$
  select
    id,
    label,
    type,
    lang,
    description,
    1 - (embedding <=> query_vec) as similarity
  from public.helpbot_entities
  where embedding is not null
  order by embedding <=> query_vec
  limit match_count;
$$;

-- RPC: kombiniert Graph-Kontext + Chunks für hybride RAG
create or replace function public.get_hybrid_rag_context(
  p_query_vec vector(1536),
  p_entity_limit int default 5,
  p_chunk_limit int default 5
)
returns table(source_type text, content text, relevance numeric, lang text)
language plpgsql stable as $$
begin
  return query
  -- Entitäten aus dem Graph
  select
    'entity'::text as source_type,
    e.label || ': ' || coalesce(e.description, '') as content,
    (1 - (e.embedding <=> p_query_vec))::numeric as relevance,
    e.lang
  from public.helpbot_entities e
  where e.embedding is not null
  order by e.embedding <=> p_query_vec
  limit p_entity_limit;

  return query
  -- Chunks aus der RAG-Datenbank
  select
    'chunk'::text as source_type,
    c.content,
    (1 - (c.embedding <=> p_query_vec))::numeric as relevance,
    d.lang
  from public.helpbot_chunks c
  join public.helpbot_docs d on d.id = c.doc_id
  where c.embedding is not null
  order by c.embedding <=> p_query_vec
  limit p_chunk_limit;
end;
$$;