-- Add UNIQUE index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_compliance_summary_tenant
  ON public.mv_compliance_summary(tenant_id);