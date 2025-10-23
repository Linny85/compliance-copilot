-- Phase 16: Self-Optimizing Tuner + Active Learning

-- 1) Weight history for ensemble model
create table if not exists ensemble_weight_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  weight_arima numeric(5,2),
  weight_gradient numeric(5,2),
  weight_bayes numeric(5,2),
  reliability numeric(5,2),
  mae numeric(6,2),
  adjusted_at timestamptz default now()
);

create index if not exists idx_ewh_tenant_time
  on ensemble_weight_history(tenant_id, adjusted_at desc);

alter table ensemble_weight_history enable row level security;

create policy ewh_admin_read on ensemble_weight_history for select
  to authenticated using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = ensemble_weight_history.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

create policy ewh_service_write on ensemble_weight_history for insert
  to authenticated with check (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = ensemble_weight_history.tenant_id
        and ur.role in ('admin','master_admin')
    )
  );

-- 2) Latest weights per tenant
create or replace view v_ensemble_weight_latest as
select distinct on (tenant_id)
  tenant_id, weight_arima, weight_gradient, weight_bayes,
  reliability, mae, adjusted_at
from ensemble_weight_history
order by tenant_id, adjusted_at desc;

comment on view v_ensemble_weight_latest is
  'Latest adaptive ensemble weights per tenant (self-optimized)';