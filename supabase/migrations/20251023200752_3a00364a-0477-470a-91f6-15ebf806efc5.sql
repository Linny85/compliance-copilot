-- Phase 16E: Explainability Feedback Loop & Signal-Weighting

-- 1) Nutzer-Feedback zu Erklärungen
create table if not exists explainability_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  signal_feature text not null,
  signal_key text not null,
  signal_metric text not null,
  verdict text not null check (verdict in ('useful','not_useful','irrelevant')),
  weight numeric(6,3) not null default 1.0,
  noted_at timestamptz not null default now(),
  noted_by uuid,
  context jsonb default '{}'::jsonb
);

create index if not exists idx_expl_fb_tenant_time on explainability_feedback(tenant_id, noted_at desc);
alter table explainability_feedback enable row level security;

create policy expl_fb_admin_read
  on explainability_feedback for select
  to authenticated
  using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = explainability_feedback.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

create policy expl_fb_tenant_write
  on explainability_feedback for insert
  to authenticated
  with check (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = explainability_feedback.tenant_id
    )
  );

-- 2) Aggregierte Signal-Gewichte
create table if not exists explainability_signal_weights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  feature text not null,
  key text not null,
  metric text not null,
  weight numeric(6,3) not null default 1.0,
  confidence numeric(5,2) not null default 50,
  sample int not null default 0,
  mae_impact numeric(6,3),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_expl_w_tfm on explainability_signal_weights(tenant_id, feature, key, metric);
alter table explainability_signal_weights enable row level security;

create policy expl_w_admin_read
  on explainability_signal_weights for select
  to authenticated
  using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = explainability_signal_weights.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

create policy expl_w_service_write
  on explainability_signal_weights for insert
  to authenticated
  with check (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = explainability_signal_weights.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

create policy expl_w_service_update
  on explainability_signal_weights for update
  to authenticated
  using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = explainability_signal_weights.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

-- 3) View: Top-Erklärungen inkl. Gewicht
create or replace view v_explainability_top_weighted as
select
  t.tenant_id,
  jsonb_agg(
    jsonb_build_object(
      'feature', t.feature,
      'key', t.key,
      'metric', t.metric,
      'value', round(t.avg_value::numeric, 4),
      'p_value', t.best_p,
      'sample', t.n,
      'weight', coalesce(w.weight, 1.0),
      'confidence', coalesce(w.confidence, 50)
    )
    order by (abs(t.avg_value) * coalesce(w.weight,1.0)) desc,
             coalesce(w.confidence,50) desc,
             t.n desc
  ) as top_signals_weighted,
  now() as computed_at
from (
  select tenant_id, feature, key, metric,
         avg(value) as avg_value,
         min(p_value) as best_p,
         sum(sample_size) as n
  from explainability_signals
  where created_at >= now() - interval '30 days'
  group by tenant_id, feature, key, metric
) t
left join explainability_signal_weights w
  on w.tenant_id = t.tenant_id and w.feature = t.feature and w.key = t.key and w.metric = t.metric
group by t.tenant_id;

comment on view v_explainability_top_weighted is 'Explainability Top-Signale gewichtet mit Feedback';