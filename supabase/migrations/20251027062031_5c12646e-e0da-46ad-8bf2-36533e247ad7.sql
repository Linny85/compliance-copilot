-- Helper: get_my_tenant() falls noch nicht vorhanden
create or replace function public.get_my_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

-- Tabelle tenant_analysis (referenziert "Unternehmen" statt "companies")
create table if not exists public.tenant_analysis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public."Unternehmen"(id) on delete cascade,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  input jsonb not null,
  result jsonb not null,
  rules_version int not null default 1
);

-- Indizes
create index if not exists idx_tenant_analysis_tenant on public.tenant_analysis(tenant_id);
create index if not exists idx_tenant_analysis_created_at on public.tenant_analysis(created_at desc);

-- RLS
alter table public.tenant_analysis enable row level security;

drop policy if exists p_tenant_analysis_select on public.tenant_analysis;
create policy p_tenant_analysis_select
  on public.tenant_analysis
  for select
  using (tenant_id = public.get_my_tenant());

drop policy if exists p_tenant_analysis_insert on public.tenant_analysis;
create policy p_tenant_analysis_insert
  on public.tenant_analysis
  for insert
  with check (tenant_id = public.get_my_tenant());

drop policy if exists p_tenant_analysis_update on public.tenant_analysis;
create policy p_tenant_analysis_update
  on public.tenant_analysis
  for update
  using (tenant_id = public.get_my_tenant())
  with check (tenant_id = public.get_my_tenant());

-- Materialized View (aktueller Stand je Tenant)
drop materialized view if exists public.mv_tenant_scope;
create materialized view public.mv_tenant_scope as
select
  ta.tenant_id,
  ta.result->>'ti_status'           as ti_status,
  ta.result->>'nis2_status'         as nis2_status,
  ta.result->>'classification'      as nis2_class,
  ta.result->>'ai_act_training'     as ai_training,
  ta.result->>'ai_act_role'         as ai_role,
  ta.updated_at
from public.tenant_analysis ta
where ta.updated_at = (
  select max(updated_at) from public.tenant_analysis x where x.tenant_id = ta.tenant_id
);

create index if not exists idx_mv_tenant_scope_tenant on public.mv_tenant_scope(tenant_id);