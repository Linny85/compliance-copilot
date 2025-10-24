-- Phase 2.5: Knowledge Graph & Cross-Session Insights

-- Entitäten: Gesetze, Artikel, Begriffe, Organisationen, Themen
create table if not exists public.helpbot_entities (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  type text check (type in ('law','article','concept','organization','topic')),
  lang text default 'de',
  description text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Beziehungen zwischen Entitäten
create table if not exists public.helpbot_relations (
  id uuid primary key default gen_random_uuid(),
  source uuid references public.helpbot_entities(id) on delete cascade,
  target uuid references public.helpbot_entities(id) on delete cascade,
  relation text check (relation in ('refers_to','explains','derived_from','contradicts','same_as')),
  weight numeric default 1.0 check (weight>=0 and weight<=1),
  created_at timestamptz default now()
);

-- Zuordnung von Nachrichten/Sessions zu Entitäten
create table if not exists public.helpbot_entity_links (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.helpbot_messages(id) on delete cascade,
  entity_id uuid references public.helpbot_entities(id) on delete cascade,
  confidence numeric default 0.8,
  created_at timestamptz default now()
);

-- Indizes für Vektorsuche und Queries
create index if not exists idx_helpbot_entities_embedding
  on public.helpbot_entities using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_helpbot_entities_label on public.helpbot_entities(label);
create index if not exists idx_helpbot_entities_type on public.helpbot_entities(type);
create index if not exists idx_helpbot_relations_source on public.helpbot_relations(source);
create index if not exists idx_helpbot_relations_target on public.helpbot_relations(target);
create index if not exists idx_helpbot_entity_links_message on public.helpbot_entity_links(message_id);
create index if not exists idx_helpbot_entity_links_entity on public.helpbot_entity_links(entity_id);

-- RLS aktivieren
alter table public.helpbot_entities enable row level security;
alter table public.helpbot_relations enable row level security;
alter table public.helpbot_entity_links enable row level security;

-- RLS Policies (öffentlich lesbar, da Knowledge Graph Session-übergreifend ist)
create policy "entities_public_read" on public.helpbot_entities for select using (true);
create policy "relations_public_read" on public.helpbot_relations for select using (true);
create policy "entity_links_public_read" on public.helpbot_entity_links for select using (true);