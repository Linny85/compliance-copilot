-- Phase 16C: Feature Attribution & Root-Cause Analysis

-- 1) Root-cause Aggregationen je Tenant/Tag (letzte 30 Tage)
create or replace view v_rc_factors as
with base as (
  select
    cr.tenant_id,
    cr.created_at::date as day,
    cr.outcome,
    coalesce(ru.title, '(none)') as rule_group,
    '(none)' as region,
    ru.kind as check_type
  from check_results cr
  left join check_rules ru on ru.id = cr.rule_id
  where cr.created_at >= now() - interval '30 days'
),
agg as (
  select
    tenant_id,
    rule_group, region, check_type,
    count(*) as total,
    count(*) filter (where outcome='fail') as fails,
    100.0 * (count(*) filter (where outcome='fail')) / nullif(count(*), 0) as fail_rate
  from base
  group by tenant_id, rule_group, region, check_type
),
ranked as (
  select *,
    rank() over (partition by tenant_id order by fails desc, fail_rate desc) as r_fail,
    rank() over (partition by tenant_id order by fail_rate desc, fails desc) as r_rate
  from agg
)
select
  tenant_id, rule_group, region, check_type, total, fails, fail_rate,
  r_fail, r_rate
from ranked;

comment on view v_rc_factors is 'Top Fehler-Treiber (rule_group/region/check_type) 30d';

-- 2) Persistente Tabelle für erklärbare Faktoren
create table if not exists feature_attribution (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  time_window text not null check (time_window in ('7d','30d')),
  factors jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now()
);

create index if not exists idx_feat_attr_tenant_time on feature_attribution(tenant_id, computed_at desc);

alter table feature_attribution enable row level security;

create policy feat_attr_admin_read on feature_attribution for select
  to authenticated using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = feature_attribution.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

create policy feat_attr_service_write on feature_attribution for insert
  to authenticated with check (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = feature_attribution.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

-- 3) Materialisierte „Top K"-Sicht für UI
create or replace view v_root_cause_top as
select
  tenant_id,
  jsonb_agg(jsonb_build_object(
    'rule_group', rule_group,
    'region', region,
    'check_type', check_type,
    'fails', fails,
    'fail_rate', round(fail_rate::numeric, 2)
  ) order by fails desc, fail_rate desc) filter (where r_fail <= 5) as top_fails,
  now() as computed_at
from v_rc_factors
where r_fail <= 5
group by tenant_id;

comment on view v_root_cause_top is 'Top-5 Fehler-Treiber je Tenant (30d)';