-- Phase 2.7: Adaptive Graph Learning & Legal Inference

-- Adaptive Gewichtung & Inferenzfähigkeit für Entitäten
alter table public.helpbot_entities
  add column if not exists confidence numeric default 0.8 check (confidence between 0 and 1);

-- Adaptive Gewichtung & Inferenzfähigkeit für Relationen
alter table public.helpbot_relations
  add column if not exists support_count int default 0,
  add column if not exists inferred boolean default false,
  add column if not exists last_feedback timestamptz;

-- Tabelle für Inferenzprotokolle
create table if not exists public.helpbot_inference_logs (
  id uuid primary key default gen_random_uuid(),
  entity_source uuid references public.helpbot_entities(id) on delete cascade,
  entity_target uuid references public.helpbot_entities(id) on delete cascade,
  reasoning text not null,
  created_at timestamptz default now()
);

-- Indizes für Performance
create index if not exists idx_helpbot_inference_logs_source on public.helpbot_inference_logs(entity_source);
create index if not exists idx_helpbot_inference_logs_target on public.helpbot_inference_logs(entity_target);
create index if not exists idx_helpbot_relations_inferred on public.helpbot_relations(inferred);
create index if not exists idx_helpbot_relations_weight on public.helpbot_relations(weight desc);

-- RLS aktivieren
alter table public.helpbot_inference_logs enable row level security;

-- RLS Policies (öffentlich lesbar für Cross-Session-Insights)
create policy "inference_logs_public_read" on public.helpbot_inference_logs for select using (true);

-- RPC: Anpassung von Relationsgewichten basierend auf Feedback
create or replace function public.adjust_relation_weight(
  p_relation_id uuid,
  p_delta numeric
)
returns void
language plpgsql security definer as $$
begin
  update public.helpbot_relations
  set
    weight = least(greatest(weight + p_delta, 0), 1),
    support_count = support_count + 1,
    last_feedback = now()
  where id = p_relation_id;
end;
$$;