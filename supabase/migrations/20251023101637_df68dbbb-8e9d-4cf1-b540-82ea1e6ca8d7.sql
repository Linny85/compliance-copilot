-- Sprint 5: Automated Checks

-- 5.1 Check rules catalog
create table if not exists check_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  control_id uuid not null references controls(id) on delete restrict,
  code text not null,
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  kind text not null check (kind in ('static','query','http','script')),
  spec jsonb not null,
  schedule text,
  enabled boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique(tenant_id, code)
);

create index if not exists idx_rules_tenant on check_rules(tenant_id);
create index if not exists idx_rules_control on check_rules(control_id);
create index if not exists idx_rules_enabled on check_rules(enabled);

-- 5.2 Check runs (execution tracking with idempotency)
create table if not exists check_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  rule_id uuid not null references check_rules(id) on delete cascade,
  requested_by uuid,
  window_start timestamptz not null,
  window_end timestamptz not null,
  status text not null default 'running' check (status in ('running','success','failed','partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(tenant_id, rule_id, window_start, window_end)
);

create index if not exists idx_runs_tenant on check_runs(tenant_id);
create index if not exists idx_runs_rule on check_runs(rule_id);
create index if not exists idx_runs_status on check_runs(status);

-- 5.3 Check results (findings per run)
create table if not exists check_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references check_runs(id) on delete cascade,
  rule_id uuid not null references check_rules(id) on delete cascade,
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  outcome text not null check (outcome in ('pass','fail','warn')),
  message text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_results_tenant on check_results(tenant_id);
create index if not exists idx_results_rule on check_results(rule_id);
create index if not exists idx_results_run on check_results(run_id);
create index if not exists idx_results_outcome on check_results(outcome);

-- RLS policies
alter table check_rules enable row level security;
alter table check_runs enable row level security;
alter table check_results enable row level security;

-- SELECT: tenant members can view
create policy rules_select on check_rules
for select using (tenant_id = get_user_company(auth.uid()));

create policy runs_select on check_runs
for select using (tenant_id = get_user_company(auth.uid()));

create policy results_select on check_results
for select using (tenant_id = get_user_company(auth.uid()));

-- INSERT/UPDATE: admin, editor roles
create policy rules_insert on check_rules
for insert with check (
  (tenant_id = get_user_company(auth.uid())) AND
  (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR 
   has_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
   has_role(auth.uid(), tenant_id, 'editor'::app_role))
);

create policy rules_update on check_rules
for update using (
  (tenant_id = get_user_company(auth.uid())) AND
  (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR 
   has_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
   has_role(auth.uid(), tenant_id, 'editor'::app_role))
);

create policy rules_delete on check_rules
for delete using (
  (tenant_id = get_user_company(auth.uid())) AND
  (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR 
   has_role(auth.uid(), tenant_id, 'admin'::app_role))
);

-- Runs and results are written via service-role functions (no public write policies)