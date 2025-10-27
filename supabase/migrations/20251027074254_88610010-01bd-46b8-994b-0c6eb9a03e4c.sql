-- ========================================
-- Phase 6: Variante B (für public."Unternehmen")
-- ========================================

-- 1) Tabelle: ti
create table if not exists public.ti (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public."Unternehmen"(id) on delete cascade,
  status      text not null,
  obligations jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists ti_tenant_id_idx on public.ti(tenant_id);

-- 2) Tabelle: nis2
create table if not exists public.nis2 (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public."Unternehmen"(id) on delete cascade,
  status         text not null,
  classification text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists nis2_tenant_id_idx on public.nis2(tenant_id);

-- 3) Tabelle: ai
create table if not exists public.ai (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public."Unternehmen"(id) on delete cascade,
  training    text,
  obligations jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists ai_tenant_id_idx on public.ai(tenant_id);

-- 4) Tabelle: ai_role
create table if not exists public.ai_role (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public."Unternehmen"(id) on delete cascade,
  role        text,
  obligations jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists ai_role_tenant_id_idx on public.ai_role(tenant_id);

-- 5) Materialized View: mv_tenant_scope
drop materialized view if exists public.mv_tenant_scope;
create materialized view public.mv_tenant_scope as
select
  u.id as tenant_id,
  u.name as tenant_name,
  ti.status as ti_status,
  coalesce(ti.obligations, '[]'::jsonb) as ti_obligations,
  nis2.status as nis2_status,
  nis2.classification as nis2_classification,
  ai.training as ai_act_training,
  coalesce(ai.obligations, '[]'::jsonb) as ai_act_training_obligations,
  air.role as ai_act_role,
  coalesce(air.obligations, '[]'::jsonb) as ai_act_role_obligations
from public."Unternehmen" u
left join lateral (
  select status, obligations, updated_at
  from public.ti
  where tenant_id = u.id
  order by updated_at desc
  limit 1
) ti on true
left join lateral (
  select status, classification, updated_at
  from public.nis2
  where tenant_id = u.id
  order by updated_at desc
  limit 1
) nis2 on true
left join lateral (
  select training, obligations, updated_at
  from public.ai
  where tenant_id = u.id
  order by updated_at desc
  limit 1
) ai on true
left join lateral (
  select role, obligations, updated_at
  from public.ai_role
  where tenant_id = u.id
  order by updated_at desc
  limit 1
) air on true;

create unique index if not exists mv_tenant_scope_tid on public.mv_tenant_scope(tenant_id);

-- 6) Demo-Daten für Norrland Innovate AB
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id
  from public."Unternehmen"
  where name = 'Norrland Innovate AB'
  order by created_at asc
  limit 1;

  if v_tenant_id is null then
    raise notice 'Kein Tenant "Norrland Innovate AB" gefunden';
  else
    -- ti
    insert into public.ti (tenant_id, status, obligations)
    values (
      v_tenant_id,
      'in_scope',
      '["gematik_ecc_2026","ti_ops_guideline","kim_messaging","ti_security_controls"]'::jsonb
    );

    -- nis2
    insert into public.nis2 (tenant_id, status, classification)
    values (
      v_tenant_id,
      'watch_designation',
      null
    );

    -- ai
    insert into public.ai (tenant_id, training, obligations)
    values (
      v_tenant_id,
      'required',
      '["ai_literacy_staff","document_training_records","role_based_curriculum"]'::jsonb
    );

    -- ai_role
    insert into public.ai_role (tenant_id, role, obligations)
    values (
      v_tenant_id,
      'deployer',
      '["usage_policies","training_awareness","incident_reporting_ai","vendor_due_diligence"]'::jsonb
    );

    refresh materialized view public.mv_tenant_scope;
  end if;
end $$;