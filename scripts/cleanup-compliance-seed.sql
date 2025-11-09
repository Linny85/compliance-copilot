-- CLEANUP: Remove seeded compliance test data
-- Run this after testing to clean up demo data
-- Only removes data created in the last 1 hour for safety

BEGIN;

-- Get current user's tenant
WITH me AS (
  SELECT company_id AS tenant_id
  FROM public.profiles
  WHERE id = :USER::uuid
)

-- Delete recent training certificates
DELETE FROM public.training_certificates tc
USING me
WHERE tc.tenant_id = me.tenant_id
  AND tc.created_at >= NOW() - INTERVAL '1 hour';

-- Delete recent evidence records
WITH me AS (
  SELECT company_id AS tenant_id
  FROM public.profiles
  WHERE id = :USER::uuid
)
DELETE FROM public.evidences e
USING me
WHERE e.tenant_id = me.tenant_id
  AND e.uploaded_at >= NOW() - INTERVAL '1 hour';

-- Delete recent check rules
WITH me AS (
  SELECT company_id AS tenant_id
  FROM public.profiles
  WHERE id = :USER::uuid
)
DELETE FROM public.check_rules cr
USING me
WHERE cr.tenant_id = me.tenant_id
  AND cr.created_at >= NOW() - INTERVAL '1 hour';

COMMIT;

-- Verify cleanup
SELECT 
  'Remaining Check Rules:' AS metric, 
  COUNT(*)::text AS value
FROM check_rules cr
JOIN profiles p ON cr.tenant_id = p.company_id AND p.id = :USER::uuid
UNION ALL
SELECT 'Remaining Evidence:', COUNT(*)::text
FROM evidences e
JOIN profiles p ON e.tenant_id = p.company_id AND p.id = :USER::uuid
UNION ALL
SELECT 'Remaining Certificates:', COUNT(*)::text
FROM training_certificates tc
JOIN profiles p ON tc.tenant_id = p.company_id AND p.id = :USER::uuid;
