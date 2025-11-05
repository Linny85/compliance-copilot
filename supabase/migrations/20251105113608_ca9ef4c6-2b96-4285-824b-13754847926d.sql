
-- Drop and recreate v_compliance_overview to aggregate existing compliance views
DROP VIEW IF EXISTS v_compliance_overview CASCADE;

CREATE VIEW v_compliance_overview AS
WITH 
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

-- Evidence compliance
ev_agg AS (
  SELECT 
    tenant_id,
    evidence_ratio,
    approved,
    total AS total_evidence
  FROM v_evidence_compliance
),

-- Training compliance  
tr_agg AS (
  SELECT
    tenant_id,
    training_ratio,
    verified,
    total_users AS total_training
  FROM v_training_compliance
),

-- DPIA compliance
dp_agg AS (
  SELECT
    tenant_id,
    dpia_ratio,
    completed,
    total AS total_dpia
  FROM v_dpia_compliance
),

-- Framework-specific scores
fw_scores AS (
  SELECT
    tenant_id,
    json_agg(
      json_build_object(
        'framework_code',
        CASE 
          WHEN framework = 'NIS2' THEN 'NIS2'
          WHEN framework LIKE 'AI%' OR framework LIKE '%AI Act%' THEN 'AI_ACT'
          WHEN framework = 'GDPR' OR framework LIKE '%DSGVO%' THEN 'GDPR'
          ELSE UPPER(framework)
        END,
        'score', pass_rate
      )
    ) AS frameworks
  FROM v_control_compliance
  WHERE framework IN ('NIS2', 'GDPR', 'ISO27001') 
     OR framework LIKE 'AI%'
     OR framework LIKE '%AI Act%'
  GROUP BY tenant_id
)

SELECT
  COALESCE(ctrl.tenant_id, ev.tenant_id, tr.tenant_id, dp.tenant_id) AS tenant_id,
  
  -- Individual section percentages (convert from 0..1 to 0..100)
  COALESCE(ROUND(ctrl.avg_pass_rate * 100, 0)::integer, 0) AS controls_pct,
  COALESCE(ROUND(ev.evidence_ratio * 100, 0)::integer, 0) AS evidence_pct,
  COALESCE(ROUND(tr.training_ratio * 100, 0)::integer, 0) AS trainings_pct,
  CASE 
    WHEN COALESCE(dp.total_dpia, 0) > 1 
    THEN COALESCE(ROUND(dp.dpia_ratio * 100, 0)::integer, 0)
    ELSE 0 
  END AS dpia_pct,
  
  -- DPIA total count
  COALESCE(dp.total_dpia, 0)::integer AS dpia_total,
  
  -- Framework scores
  fw.frameworks,
  
  -- Overall score (weighted average of available sections)
  CASE
    WHEN (
      (CASE WHEN COALESCE(ctrl.total_controls, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(ev.total_evidence, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(tr.total_training, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(dp.total_dpia, 0) > 1 THEN 1 ELSE 0 END)
    ) = 0 THEN 0
    ELSE ROUND(100 * (
      COALESCE(ctrl.avg_pass_rate, 0) +
      COALESCE(ev.evidence_ratio, 0) +
      COALESCE(tr.training_ratio, 0) +
      CASE WHEN COALESCE(dp.total_dpia, 0) > 1 THEN COALESCE(dp.dpia_ratio, 0) ELSE 0 END
    ) / (
      (CASE WHEN COALESCE(ctrl.total_controls, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(ev.total_evidence, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(tr.total_training, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN COALESCE(dp.total_dpia, 0) > 1 THEN 1 ELSE 0 END)
    ), 0)::integer
  END AS overall_pct

FROM ctrl_agg ctrl
FULL OUTER JOIN ev_agg ev ON ctrl.tenant_id = ev.tenant_id
FULL OUTER JOIN tr_agg tr ON COALESCE(ctrl.tenant_id, ev.tenant_id) = tr.tenant_id
FULL OUTER JOIN dp_agg dp ON COALESCE(ctrl.tenant_id, ev.tenant_id, tr.tenant_id) = dp.tenant_id
LEFT JOIN fw_scores fw ON COALESCE(ctrl.tenant_id, ev.tenant_id, tr.tenant_id, dp.tenant_id) = fw.tenant_id;

GRANT SELECT ON v_compliance_overview TO authenticated;
