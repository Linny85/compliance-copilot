-- Compliance Monitor Views & Indices

-- Control pass rate per tenant (from latest check results)
CREATE OR REPLACE VIEW public.v_control_compliance AS
SELECT 
  cr.tenant_id,
  cr.control_id,
  c.code as control_code,
  f.code as framework,
  COUNT(*) FILTER (WHERE r.outcome = 'pass') as passed,
  COUNT(*) as total,
  CASE WHEN COUNT(*) > 0 
    THEN COUNT(*) FILTER (WHERE r.outcome = 'pass')::decimal / COUNT(*)
    ELSE 0 
  END as pass_rate
FROM check_rules cr
JOIN controls c ON c.id = cr.control_id
JOIN frameworks f ON f.id = c.framework_id
LEFT JOIN check_runs run ON run.rule_id = cr.id AND run.tenant_id = cr.tenant_id
LEFT JOIN check_results r ON r.run_id = run.id AND r.tenant_id = cr.tenant_id
WHERE cr.enabled = true 
  AND cr.deleted_at IS NULL
  AND (run.finished_at IS NULL OR run.finished_at >= NOW() - INTERVAL '30 days')
GROUP BY cr.tenant_id, cr.control_id, c.code, f.code;

-- Evidence completion ratio per tenant
CREATE OR REPLACE VIEW public.v_evidence_compliance AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE verdict = 'approved') as approved,
  COUNT(*) as total,
  CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE verdict = 'approved')::decimal / COUNT(*)
    ELSE 0
  END as evidence_ratio
FROM evidences
GROUP BY tenant_id;

-- DPIA completion ratio per tenant
CREATE OR REPLACE VIEW public.v_dpia_compliance AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE status IN ('approved', 'completed')) as completed,
  COUNT(*) as total,
  CASE WHEN COUNT(*) > 0
    THEN COUNT(*) FILTER (WHERE status IN ('approved', 'completed'))::decimal / COUNT(*)
    ELSE 0
  END as dpia_ratio
FROM dpia_records
GROUP BY tenant_id;

-- Training certificate ratio per tenant
CREATE OR REPLACE VIEW public.v_training_compliance AS
SELECT 
  tc.tenant_id,
  COUNT(*) FILTER (WHERE tc.status = 'verified') as verified,
  COUNT(DISTINCT tc.user_id) as users_with_certs,
  COUNT(DISTINCT p.id) as total_users,
  CASE WHEN COUNT(DISTINCT p.id) > 0
    THEN COUNT(*) FILTER (WHERE tc.status = 'verified')::decimal / COUNT(DISTINCT p.id)
    ELSE 0
  END as training_ratio
FROM training_certificates tc
JOIN profiles p ON p.company_id = tc.tenant_id
GROUP BY tc.tenant_id;

-- Framework-level compliance scores
CREATE OR REPLACE VIEW public.v_framework_compliance AS
SELECT 
  tenant_id,
  framework,
  AVG(pass_rate) as score
FROM v_control_compliance
GROUP BY tenant_id, framework;

-- Overall compliance summary per tenant
CREATE OR REPLACE VIEW public.v_compliance_overview AS
SELECT 
  t.tenant_id,
  COALESCE(cc.avg_pass_rate, 0) * 0.50 +
  COALESCE(ec.evidence_ratio, 0) * 0.20 +
  COALESCE(tc.training_ratio, 0) * 0.10 +
  COALESCE(dc.dpia_ratio, 0) * 0.20 as overall_score,
  COALESCE(cc.avg_pass_rate, 0) as controls_score,
  COALESCE(ec.evidence_ratio, 0) as evidence_score,
  COALESCE(tc.training_ratio, 0) as training_score,
  COALESCE(dc.dpia_ratio, 0) as dpia_score
FROM (SELECT DISTINCT tenant_id FROM check_rules) t
LEFT JOIN (
  SELECT tenant_id, AVG(pass_rate) as avg_pass_rate 
  FROM v_control_compliance 
  GROUP BY tenant_id
) cc ON cc.tenant_id = t.tenant_id
LEFT JOIN v_evidence_compliance ec ON ec.tenant_id = t.tenant_id
LEFT JOIN v_training_compliance tc ON tc.tenant_id = t.tenant_id
LEFT JOIN v_dpia_compliance dc ON dc.tenant_id = t.tenant_id;

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_check_results_tenant_outcome 
  ON check_results(tenant_id, outcome);

CREATE INDEX IF NOT EXISTS idx_check_runs_tenant_finished 
  ON check_runs(tenant_id, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidences_tenant_verdict 
  ON evidences(tenant_id, verdict);

CREATE INDEX IF NOT EXISTS idx_dpia_records_tenant_status 
  ON dpia_records(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_training_certs_tenant_status 
  ON training_certificates(tenant_id, status);

-- Grant select on views to authenticated users
GRANT SELECT ON public.v_control_compliance TO authenticated;
GRANT SELECT ON public.v_evidence_compliance TO authenticated;
GRANT SELECT ON public.v_dpia_compliance TO authenticated;
GRANT SELECT ON public.v_training_compliance TO authenticated;
GRANT SELECT ON public.v_framework_compliance TO authenticated;
GRANT SELECT ON public.v_compliance_overview TO authenticated;