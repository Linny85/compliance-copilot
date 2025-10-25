-- === Compliance Monitor - Trend & Materialized View Extensions (Fixed) ===

-- Trend view: Compare current 30 days vs previous 30 days
CREATE OR REPLACE VIEW public.v_control_compliance_trend AS
WITH control_scores_cur AS (
  SELECT
    cr.tenant_id,
    cr.control_id,
    CASE WHEN COUNT(r.*) > 0
         THEN COUNT(*) FILTER (WHERE r.outcome='pass')::decimal / COUNT(*)
         ELSE 0 END AS pass_rate
  FROM check_rules cr
  JOIN controls c ON c.id = cr.control_id
  JOIN frameworks f ON f.id = c.framework_id
  LEFT JOIN check_runs run ON run.rule_id = cr.id AND run.tenant_id = cr.tenant_id
  LEFT JOIN check_results r ON r.run_id = run.id AND r.tenant_id = cr.tenant_id
  WHERE cr.enabled = true
    AND cr.deleted_at IS NULL
    AND run.finished_at >= NOW() - INTERVAL '30 days'
  GROUP BY cr.tenant_id, cr.control_id
),
control_scores_prev AS (
  SELECT
    cr.tenant_id,
    cr.control_id,
    CASE WHEN COUNT(r.*) > 0
         THEN COUNT(*) FILTER (WHERE r.outcome='pass')::decimal / COUNT(*)
         ELSE 0 END AS pass_rate
  FROM check_rules cr
  JOIN controls c ON c.id = cr.control_id
  JOIN frameworks f ON f.id = c.framework_id
  LEFT JOIN check_runs run ON run.rule_id = cr.id AND run.tenant_id = cr.tenant_id
  LEFT JOIN check_results r ON r.run_id = run.id AND r.tenant_id = cr.tenant_id
  WHERE cr.enabled = true
    AND cr.deleted_at IS NULL
    AND run.finished_at >= NOW() - INTERVAL '60 days'
    AND run.finished_at <  NOW() - INTERVAL '30 days'
  GROUP BY cr.tenant_id, cr.control_id
),
cur AS (
  SELECT tenant_id, AVG(pass_rate) AS cur_score
  FROM control_scores_cur
  GROUP BY tenant_id
),
prev AS (
  SELECT tenant_id, AVG(pass_rate) AS prev_score
  FROM control_scores_prev
  GROUP BY tenant_id
)
SELECT
  COALESCE(cur.tenant_id, prev.tenant_id) AS tenant_id,
  COALESCE(cur.cur_score, 0)  AS cur_score,
  COALESCE(prev.prev_score,0) AS prev_score,
  COALESCE(cur.cur_score,0) - COALESCE(prev.prev_score,0) AS delta_score
FROM cur FULL OUTER JOIN prev ON prev.tenant_id = cur.tenant_id;

GRANT SELECT ON public.v_control_compliance_trend TO authenticated;

-- Materialized view for better performance
DROP MATERIALIZED VIEW IF EXISTS public.mv_compliance_summary CASCADE;
CREATE MATERIALIZED VIEW public.mv_compliance_summary AS
SELECT * FROM public.v_compliance_summary;

CREATE INDEX IF NOT EXISTS idx_mv_compliance_summary_tenant
  ON public.mv_compliance_summary(tenant_id);

GRANT SELECT ON public.mv_compliance_summary TO authenticated;

-- Admin-only RPC to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_compliance_summary_rpc()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS
$$
DECLARE
  user_role text;
BEGIN
  -- Check if user has admin role via user_roles table
  SELECT role::text INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid()
    AND role IN ('admin', 'master_admin')
  LIMIT 1;

  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_compliance_summary;
  RETURN 'success';
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_compliance_summary_rpc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_compliance_summary_rpc() TO authenticated;