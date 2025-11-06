
-- Fix framework_progress RLS policy
DROP POLICY IF EXISTS "framework_progress_tenant_read" ON framework_progress;

CREATE POLICY "framework_progress_tenant_read"
  ON framework_progress
  FOR SELECT
  TO authenticated, anon
  USING (tenant_id = public.get_user_company(auth.uid()));

-- Recreate v_framework_progress as a security definer function-backed view
-- This ensures proper RLS filtering
DROP VIEW IF EXISTS v_framework_progress CASCADE;

CREATE OR REPLACE VIEW v_framework_progress
WITH (security_invoker = true)
AS
SELECT 
  t.tenant_id,
  f.code AS framework_code,
  f.name AS framework_name,
  COALESCE(p.score, 0::double precision) AS score,
  COALESCE(p.updated_at, now()) AS updated_at
FROM (
  SELECT DISTINCT tenant_id
  FROM framework_progress
  WHERE tenant_id = public.get_user_company(auth.uid())
) t
CROSS JOIN compliance_frameworks f
LEFT JOIN framework_progress p 
  ON p.tenant_id = t.tenant_id 
  AND upper(p.framework_code) = upper(f.code);

COMMENT ON VIEW v_framework_progress IS 'Framework progress for current user tenant with security invoker';
