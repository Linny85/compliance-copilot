-- ===== Dashboard Summary Views =====
-- Clean slate (idempotent)
DROP VIEW IF EXISTS public.summary_overview CASCADE;
DROP VIEW IF EXISTS public.summary_training CASCADE;
DROP VIEW IF EXISTS public.summary_evidence CASCADE;
DROP VIEW IF EXISTS public.summary_controls CASCADE;

-- Note: Based on actual schema, controls table doesn't have company_id directly
-- We'll need to join through policy_assignments or control mappings
-- For now, creating placeholder views that work with tenant context

-- ===== Evidence Summary =====
CREATE VIEW public.summary_evidence AS
WITH base AS (
  SELECT
    e.tenant_id AS company_id,
    COUNT(*) AS total_evidence,
    COUNT(*) FILTER (WHERE e.review_status = 'verified' OR e.verdict = 'verified') AS verified_evidence
  FROM public.evidences e
  WHERE e.tenant_id IS NOT NULL
  GROUP BY e.tenant_id
)
SELECT
  company_id,
  total_evidence,
  verified_evidence,
  ROUND(100.0 * COALESCE(NULLIF(verified_evidence, 0)::numeric / NULLIF(total_evidence, 0), 0), 1) AS evidence_pct
FROM base;

-- ===== Training Summary =====
CREATE VIEW public.summary_training AS
WITH base AS (
  SELECT
    tc.tenant_id AS company_id,
    COUNT(DISTINCT tc.user_id) AS total_users,
    COUNT(DISTINCT tc.user_id) FILTER (WHERE tc.status = 'verified') AS users_passed
  FROM public.training_certificates tc
  WHERE tc.tenant_id IS NOT NULL
  GROUP BY tc.tenant_id
)
SELECT
  company_id,
  total_users,
  users_passed,
  ROUND(100.0 * COALESCE(NULLIF(users_passed, 0)::numeric / NULLIF(total_users, 0), 0), 1) AS training_pct
FROM base;

-- ===== Controls Summary (using check_rules as proxy for controls compliance) =====
CREATE VIEW public.summary_controls AS
WITH base AS (
  SELECT
    cr.tenant_id AS company_id,
    COUNT(*) AS total_controls,
    COUNT(*) FILTER (WHERE cr.enabled = true) AS enabled_controls
  FROM public.check_rules cr
  WHERE cr.tenant_id IS NOT NULL AND cr.deleted_at IS NULL
  GROUP BY cr.tenant_id
)
SELECT
  company_id,
  total_controls,
  enabled_controls,
  ROUND(100.0 * COALESCE(NULLIF(enabled_controls, 0)::numeric / NULLIF(total_controls, 0), 0), 1) AS controls_pct,
  -- Framework-specific (placeholder - would need actual framework mappings)
  0.0 AS nis2_pct,
  0.0 AS ai_act_pct,
  0.0 AS dsgvo_pct
FROM base;

-- ===== Overview (consolidated dashboard source) =====
CREATE VIEW public.summary_overview AS
SELECT
  COALESCE(co.company_id, ev.company_id, tr.company_id) AS company_id,
  -- Component percentages
  COALESCE(co.controls_pct, 0) AS controls_pct,
  COALESCE(ev.evidence_pct, 0) AS evidence_pct,
  COALESCE(tr.training_pct, 0) AS training_pct,
  -- Framework percentages
  COALESCE(co.nis2_pct, 0) AS nis2_pct,
  COALESCE(co.ai_act_pct, 0) AS ai_act_pct,
  COALESCE(co.dsgvo_pct, 0) AS dsgvo_pct,
  -- Overall average
  ROUND(
    (COALESCE(co.controls_pct, 0) + COALESCE(ev.evidence_pct, 0) + COALESCE(tr.training_pct, 0)) / 3.0,
    1
  ) AS overall_pct
FROM public.summary_controls co
FULL OUTER JOIN public.summary_evidence ev ON ev.company_id = co.company_id
FULL OUTER JOIN public.summary_training tr ON tr.company_id = co.company_id;

-- Grant SELECT to authenticated users (RLS will apply through base tables)
GRANT SELECT ON public.summary_overview TO authenticated;
GRANT SELECT ON public.summary_controls TO authenticated;
GRANT SELECT ON public.summary_evidence TO authenticated;
GRANT SELECT ON public.summary_training TO authenticated;

-- Indexes on base tables for performance
CREATE INDEX IF NOT EXISTS idx_evidences_tenant ON public.evidences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_cert_tenant ON public.training_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_check_rules_tenant ON public.check_rules(tenant_id) WHERE deleted_at IS NULL;

COMMENT ON VIEW public.summary_overview IS 'Consolidated compliance metrics for dashboard';
