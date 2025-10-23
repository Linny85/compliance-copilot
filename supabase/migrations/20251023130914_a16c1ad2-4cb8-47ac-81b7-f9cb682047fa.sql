-- Performance indexes for control mapping queries
create index if not exists idx_rules_tenant_control
  on check_rules (tenant_id, control_id);

create index if not exists idx_results_tenant_rule_created
  on check_results (tenant_id, rule_id, created_at desc);

create index if not exists idx_controls_code
  on controls (code);

create index if not exists idx_controls_title
  on controls (title);