-- ============================================================================
-- Compliance Framework Normalization - Ensures all frameworks always present
-- ============================================================================

-- 1) Canonical frameworks table
CREATE TABLE IF NOT EXISTS public.compliance_frameworks (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert known frameworks
INSERT INTO public.compliance_frameworks (code, name) VALUES
  ('NIS2', 'NIS2'),
  ('AI_ACT', 'EU AI Act'),
  ('GDPR', 'GDPR'),
  ('ISO27001', 'ISO/IEC 27001')
ON CONFLICT (code) DO NOTHING;

-- 2) Framework progress table (if not exists)
CREATE TABLE IF NOT EXISTS public.framework_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  framework_code TEXT NOT NULL REFERENCES public.compliance_frameworks(code),
  score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, framework_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_framework_progress_tenant 
  ON public.framework_progress(tenant_id);

-- RLS policies for framework_progress
ALTER TABLE public.framework_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS framework_progress_tenant_read ON public.framework_progress;
CREATE POLICY framework_progress_tenant_read
  ON public.framework_progress FOR SELECT
  USING (tenant_id = get_user_company(auth.uid()));

DROP POLICY IF EXISTS framework_progress_admin_write ON public.framework_progress;
CREATE POLICY framework_progress_admin_write
  ON public.framework_progress FOR ALL
  USING (
    tenant_id = get_user_company(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'admin'::app_role) 
      OR has_role(auth.uid(), tenant_id, 'master_admin'::app_role))
  );

-- 3) Normalized view - always returns all frameworks for each tenant
CREATE OR REPLACE VIEW public.v_framework_progress AS
SELECT
  t.tenant_id,
  f.code AS framework_code,
  f.name AS framework_name,
  COALESCE(p.score, 0)::DOUBLE PRECISION AS score,
  COALESCE(p.updated_at, now()) AS updated_at
FROM (SELECT DISTINCT tenant_id FROM public.framework_progress) t
CROSS JOIN public.compliance_frameworks f
LEFT JOIN public.framework_progress p
  ON p.tenant_id = t.tenant_id
  AND UPPER(p.framework_code) = UPPER(f.code);

-- 4) Seed test data for existing tenant
INSERT INTO public.framework_progress (tenant_id, framework_code, score)
VALUES
  ('03954104-c7fb-46f5-b934-63cba9c331ef', 'NIS2', 0.82),
  ('03954104-c7fb-46f5-b934-63cba9c331ef', 'AI_ACT', 0.67),
  ('03954104-c7fb-46f5-b934-63cba9c331ef', 'GDPR', 0.58),
  ('03954104-c7fb-46f5-b934-63cba9c331ef', 'ISO27001', 0.75)
ON CONFLICT (tenant_id, framework_code) 
DO UPDATE SET score = EXCLUDED.score, updated_at = now();

-- Grant necessary permissions
GRANT SELECT ON public.compliance_frameworks TO authenticated;
GRANT SELECT ON public.v_framework_progress TO authenticated;