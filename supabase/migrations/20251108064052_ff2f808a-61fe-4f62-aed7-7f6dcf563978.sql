-- Fix v_compliance_overview to always return core frameworks (NIS2, AI_ACT, GDPR)
-- with scores normalized to 0..1 range

DROP VIEW IF EXISTS v_compliance_overview CASCADE;

CREATE VIEW v_compliance_overview AS
WITH 
-- Define required core frameworks
required_frameworks AS (
  SELECT unnest(ARRAY['NIS2', 'AI_ACT', 'GDPR']) AS framework_code
),

-- Aggregate control compliance across all frameworks
ctrl_agg AS (
  SELECT 
    tenant_id,
    AVG(pass_rate) AS avg_pass_rate,
    SUM(passed) AS total_passed,
    SUM(total) AS total_controls
  FROM v_control_compliance
  GROUP BY tenant_id
),

-- Aggregate evidence compliance
ev_agg AS (
  SELECT 
    tenant_id,
    evidence_ratio,
    approved,
    total AS total_evidence
  FROM v_evidence_compliance
),

-- Aggregate training compliance
tr_agg AS (
  SELECT 
    tenant_id,
    training_ratio,
    verified,
    total_users AS total_training
  FROM v_training_compliance
),

-- Aggregate DPIA compliance
dp_agg AS (
  SELECT 
    tenant_id,
    dpia_ratio,
    completed,
    total AS total_dpia
  FROM v_dpia_compliance
),

-- All unique tenant IDs
all_tenants AS (
  SELECT DISTINCT tenant_id FROM ctrl_agg
  UNION
  SELECT DISTINCT tenant_id FROM ev_agg
  UNION
  SELECT DISTINCT tenant_id FROM tr_agg
  UNION
  SELECT DISTINCT tenant_id FROM dp_agg
),

-- Get framework scores - normalize to 0..1 range
fw_actual AS (
  SELECT 
    tenant_id,
    framework,
    CASE 
      WHEN score > 1 THEN score / 100.0
      ELSE score
    END AS score_unit
  FROM v_framework_compliance
),

-- Merge required frameworks with actual scores for each tenant
fw_merged AS (
  SELECT 
    t.tenant_id,
    rf.framework_code,
    COALESCE(fa.score_unit, 0.0) AS score_unit
  FROM all_tenants t
  CROSS JOIN required_frameworks rf
  LEFT JOIN fw_actual fa ON fa.tenant_id = t.tenant_id 
    AND fa.framework = rf.framework_code
),

-- Aggregate framework scores into JSON array per tenant
fw_scores AS (
  SELECT 
    tenant_id,
    jsonb_agg(
      jsonb_build_object(
        'framework_code', framework_code,
        'score', score_unit
      ) ORDER BY framework_code
    ) AS frameworks
  FROM fw_merged
  GROUP BY tenant_id
)

SELECT 
  t.tenant_id,
  
  -- Overall percentage (0..100)
  CASE 
    WHEN COALESCE(ctrl.avg_pass_rate, 0) > 0 
      OR COALESCE(ev.evidence_ratio, 0) > 0 
      OR COALESCE(tr.training_ratio, 0) > 0 
      OR COALESCE(dp.dpia_ratio, 0) > 0 
    THEN ROUND(
      COALESCE(ctrl.avg_pass_rate, 0) * 50 + 
      COALESCE(ev.evidence_ratio, 0) * 20 + 
      COALESCE(tr.training_ratio, 0) * 10 + 
      COALESCE(dp.dpia_ratio, 0) * 20
    )::integer
    ELSE 0
  END AS overall_pct,
  
  -- Component percentages (0..100)
  ROUND(COALESCE(ctrl.avg_pass_rate, 0) * 100)::integer AS controls_pct,
  ROUND(COALESCE(ev.evidence_ratio, 0) * 100)::integer AS evidence_pct,
  ROUND(COALESCE(tr.training_ratio, 0) * 100)::integer AS trainings_pct,
  ROUND(COALESCE(dp.dpia_ratio, 0) * 100)::integer AS dpia_pct,
  
  -- Metadata
  COALESCE(dp.total_dpia, 0) AS dpia_total,
  
  -- Framework scores as JSON array (scores in 0..1 range)
  COALESCE(fw.frameworks, '[]'::jsonb) AS frameworks

FROM all_tenants t
LEFT JOIN ctrl_agg ctrl ON ctrl.tenant_id = t.tenant_id
LEFT JOIN ev_agg ev ON ev.tenant_id = t.tenant_id
LEFT JOIN tr_agg tr ON tr.tenant_id = t.tenant_id
LEFT JOIN dp_agg dp ON dp.tenant_id = t.tenant_id
LEFT JOIN fw_scores fw ON fw.tenant_id = t.tenant_id;

GRANT SELECT ON v_compliance_overview TO authenticated;