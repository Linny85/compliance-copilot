-- Performance indexes for check results queries
create index if not exists idx_check_results_tenant_created 
  on check_results (tenant_id, created_at desc);

create index if not exists idx_check_runs_tenant_window 
  on check_runs (tenant_id, window_start, window_end);

create index if not exists idx_check_rules_tenant_code 
  on check_rules (tenant_id, code);

create index if not exists idx_check_rules_tenant_control 
  on check_rules (tenant_id, control_id) 
  where control_id is not null;