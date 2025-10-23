-- Phase 15B: Ensemble Predictive Intelligence

-- 1) Ensemble Predictions Table
create table if not exists forecast_ensemble (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  model_arima numeric(6,2),
  model_gradient numeric(6,2),
  model_bayes numeric(6,2),
  weight_arima numeric(5,2) default 0.33,
  weight_gradient numeric(5,2) default 0.33,
  weight_bayes numeric(5,2) default 0.34,
  forecast_sr_90d numeric(6,2),
  lower_ci numeric(6,2),
  upper_ci numeric(6,2),
  generated_at timestamptz default now()
);

create index if not exists idx_forecast_ensemble_tenant_time
  on forecast_ensemble(tenant_id, generated_at desc);

alter table forecast_ensemble enable row level security;

create policy fe_admin_read
  on forecast_ensemble for select
  to authenticated
  using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = forecast_ensemble.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

create policy fe_service_write
  on forecast_ensemble for insert
  to authenticated
  with check (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = forecast_ensemble.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

-- 2) View: latest ensemble forecast per tenant
create or replace view v_forecast_ensemble_latest as
select distinct on (tenant_id)
  tenant_id, forecast_sr_90d, lower_ci, upper_ci,
  weight_arima, weight_gradient, weight_bayes,
  generated_at
from forecast_ensemble
order by tenant_id, generated_at desc;

comment on view v_forecast_ensemble_latest is
  'Latest 90-day blended ensemble forecast per tenant';