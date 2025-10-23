-- Performance indices for check_rules
CREATE INDEX IF NOT EXISTS idx_check_rules_tenant_enabled
  ON check_rules(tenant_id, enabled);

-- Performance indices for check_runs (idempotency + filtering)
CREATE INDEX IF NOT EXISTS idx_check_runs_tenant_rule_window
  ON check_runs(tenant_id, rule_id, window_start, window_end);

CREATE INDEX IF NOT EXISTS idx_check_runs_status_finished_at
  ON check_runs(status, finished_at);

-- Performance indices for check_results (listing + drilldown)
CREATE INDEX IF NOT EXISTS idx_check_results_tenant_created_at
  ON check_results(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_check_results_run
  ON check_results(run_id);

-- Performance index for controls (joins in list-checks)
CREATE INDEX IF NOT EXISTS idx_controls_code ON controls(code);