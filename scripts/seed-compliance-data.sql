-- SEED: Compliance Demo Data for Dashboard Testing
-- Run this in Supabase SQL Editor with your user UUID
-- Replace :USER with your actual user UUID (e.g., from auth.users)

BEGIN;

-- Get current user's tenant_id and user_id
WITH me AS (
  SELECT id AS user_id, company_id AS tenant_id
  FROM public.profiles
  WHERE id = :USER::uuid
),
-- Get control IDs for each framework
nis2_controls AS (
  SELECT id, code FROM controls WHERE code LIKE 'NIS2-%' LIMIT 4
),
ai_controls AS (
  SELECT id, code FROM controls WHERE code LIKE 'AI-%' LIMIT 3
),
gdpr_controls AS (
  SELECT id, code FROM controls WHERE code LIKE 'GDPR-%' LIMIT 3
)

-- 1) Insert Check Rules (compliance monitoring rules)
INSERT INTO public.check_rules (
  tenant_id, control_id, code, title, description, 
  severity, kind, spec, enabled, created_by
)
SELECT 
  m.tenant_id,
  c.id,
  'CHK-' || c.code,
  'Check for ' || c.code,
  'Automated compliance check',
  'medium',
  'automated',
  '{"check_type": "automated"}'::jsonb,
  true,
  m.user_id
FROM me m
CROSS JOIN (
  SELECT * FROM nis2_controls
  UNION ALL SELECT * FROM ai_controls
  UNION ALL SELECT * FROM gdpr_controls
) c;

-- 2) Insert Evidence (verified documentation)
-- First, get some control IDs we just created rules for
WITH me AS (
  SELECT id AS user_id, company_id AS tenant_id
  FROM public.profiles
  WHERE id = :USER::uuid
),
recent_controls AS (
  SELECT DISTINCT control_id 
  FROM check_rules cr
  JOIN me m ON cr.tenant_id = m.tenant_id
  ORDER BY control_id
  LIMIT 5
)
INSERT INTO public.evidences (
  tenant_id, control_id, file_path, file_size, 
  hash_sha256, uploaded_by, verdict
)
SELECT 
  m.tenant_id,
  rc.control_id,
  '/evidence/' || gen_random_uuid()::text || '.pdf',
  1024 * (1 + (random() * 100)::int),
  encode(gen_random_bytes(32), 'hex'),
  m.user_id,
  CASE 
    WHEN row_number() OVER () <= 3 THEN 'approved'
    ELSE 'pending'
  END
FROM me m
CROSS JOIN recent_controls rc
LIMIT 5;

-- 3) Insert Training Certificates (staff training completion)
WITH me AS (
  SELECT id AS user_id, company_id AS tenant_id
  FROM public.profiles
  WHERE id = :USER::uuid
)
INSERT INTO public.training_certificates (
  tenant_id, user_id, title, provider, 
  date_completed, status, training_tag
)
SELECT 
  m.tenant_id,
  m.user_id,
  v.title,
  v.provider,
  CURRENT_DATE - (random() * 90)::int,
  v.status,
  v.tag
FROM me m
CROSS JOIN (
  VALUES
    ('NIS2 Awareness Training', 'Internal', 'verified', 'nis2'),
    ('AI Act Compliance', 'External Provider', 'verified', 'ai_act'),
    ('GDPR Fundamentals', 'Data Protection Office', 'pending', 'gdpr')
) AS v(title, provider, status, tag);

COMMIT;

-- Verify the seed data
SELECT 'Check Rules Created:' AS step, COUNT(*) AS count
FROM check_rules cr
JOIN profiles p ON cr.tenant_id = p.company_id AND p.id = :USER::uuid
UNION ALL
SELECT 'Evidence Records Created:', COUNT(*)
FROM evidences e
JOIN profiles p ON e.tenant_id = p.company_id AND p.id = :USER::uuid
UNION ALL
SELECT 'Training Certificates Created:', COUNT(*)
FROM training_certificates tc
JOIN profiles p ON tc.tenant_id = p.company_id AND p.id = :USER::uuid;

-- Check computed compliance scores
SELECT * FROM v_compliance_overview
WHERE tenant_id = (SELECT company_id FROM profiles WHERE id = :USER::uuid);
