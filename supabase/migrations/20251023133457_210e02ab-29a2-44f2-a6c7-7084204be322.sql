-- Add deleted_at column for soft-delete
alter table public.check_rules add column if not exists deleted_at timestamptz;

-- Create index for non-deleted rules
create index if not exists check_rules_tenant_deleted_idx
  on public.check_rules (tenant_id, deleted_at)
  where deleted_at is null;

-- Additional performance indices
create index if not exists check_results_tenant_rule_created_idx
  on public.check_results (tenant_id, rule_id, created_at desc);

create index if not exists check_runs_tenant_started_idx
  on public.check_runs (tenant_id, started_at desc);