-- Phase 16D: Predictive Explainability & Trend Correlation (Fixed v2)
-- 1) Tägliche Erfolgsrate je Tenant (30d)
create or replace view v_daily_sr_30d as
select
  cr.tenant_id,
  date_trunc('day', cr.created_at) as day,
  count(*)::int as total,
  count(*) filter (where cr.outcome='pass')::int as passed,
  100.0 * count(*) filter (where cr.outcome='pass') / nullif(count(*),0) as sr
from check_results cr
where cr.created_at >= now() - interval '30 days'
group by cr.tenant_id, date_trunc('day', cr.created_at);

comment on view v_daily_sr_30d is 'Daily success rate per tenant over 30 days';

-- 2) Explainability Signals (persistiert)
create table if not exists explainability_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  day date not null,
  feature text not null,
  key text not null,
  metric text not null,
  value numeric(12,6) not null,
  sample_size int not null default 0,
  p_value numeric(12,6),
  direction text generated always as (
    case when value > 0 then 'positive'
         when value < 0 then 'negative'
         else 'neutral' end
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_expl_tenant_day on explainability_signals(tenant_id, day desc);
create index if not exists idx_expl_feature on explainability_signals(feature, key);

alter table explainability_signals enable row level security;

create policy expl_admin_read
on explainability_signals for select
to authenticated
using (
  exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = explainability_signals.tenant_id
      and ur.role in ('admin','master_admin')
  )
);

create policy expl_service_write
on explainability_signals for insert
to authenticated
with check (
  exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = explainability_signals.tenant_id
      and ur.role in ('admin','master_admin')
  )
);

-- 3) Top-Signale der letzten 30 Tage je Tenant
create or replace view v_explainability_top_30d as
with last30 as (
  select *
  from explainability_signals
  where created_at >= now() - interval '30 days'
),
ranked as (
  select
    tenant_id, feature, key, metric,
    avg(value) as avg_value,
    min(p_value) as best_p,
    sum(sample_size) as n,
    row_number() over (
      partition by tenant_id
      order by abs(avg(value)) desc, coalesce(min(p_value),1.0) asc, sum(sample_size) desc
    ) as rnk
  from last30
  group by tenant_id, feature, key, metric
)
select tenant_id,
       jsonb_agg(
         jsonb_build_object(
           'feature', feature,
           'key', key,
           'metric', metric,
           'value', round(avg_value::numeric, 4),
           'p_value', best_p,
           'sample', n
         )
         order by abs(avg_value) desc, coalesce(best_p,1.0) asc, n desc
       ) filter (where rnk <= 5) as top_signals,
       now() as computed_at
from ranked
where rnk <= 5
group by tenant_id;

comment on view v_explainability_top_30d is 'Top explainability signals per tenant (last 30 days)';

-- 4) Feature Flag für Explainability
alter table tenant_settings
  add column if not exists explainability_enabled boolean default true;