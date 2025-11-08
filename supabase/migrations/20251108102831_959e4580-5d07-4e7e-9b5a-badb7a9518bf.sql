-- Make body fields nullable for new step-based templates
ALTER TABLE risk_mitigation_templates
ALTER COLUMN body_de DROP NOT NULL,
ALTER COLUMN body_en DROP NOT NULL,
ALTER COLUMN body_sv DROP NOT NULL;

-- Add new columns for structured mitigation templates
ALTER TABLE risk_mitigation_templates
ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS default_owner_role text,
ADD COLUMN IF NOT EXISTS default_due_days integer,
ADD COLUMN IF NOT EXISTS risk_tags text[];

-- Create index for tag searches
CREATE INDEX IF NOT EXISTS idx_risk_mitigation_templates_tags ON risk_mitigation_templates USING GIN(risk_tags);

-- Seed: Datenverlust – Basis
INSERT INTO risk_mitigation_templates (code, title_de, title_en, title_sv, steps, default_owner_role, default_due_days, risk_tags)
VALUES (
  'MIT-BACKUP-01',
  'Datenverlust – Basis',
  'Data Loss – Baseline',
  'Dataförlust – Bas',
  '["Backup-Strategie prüfen", "RTO/RPO definieren", "Wiederherstellungstest durchführen", "Offsite/Immutable Backups aktivieren"]'::jsonb,
  'IT-Lead',
  30,
  ARRAY['backup', 'data-loss', 'business-continuity']
)
ON CONFLICT (code) DO UPDATE SET
  steps = EXCLUDED.steps,
  default_owner_role = EXCLUDED.default_owner_role,
  default_due_days = EXCLUDED.default_due_days,
  risk_tags = EXCLUDED.risk_tags;

-- Seed: Phishing – Schulung & Technik
INSERT INTO risk_mitigation_templates (code, title_de, title_en, title_sv, steps, default_owner_role, default_due_days, risk_tags)
VALUES (
  'MIT-PHISHING-01',
  'Phishing – Schulung & Technik',
  'Phishing – Training & Technical Controls',
  'Phishing – Utbildning & Teknik',
  '["Security-Awareness E-Learning zu Phishing starten", "MFA verpflichtend aktivieren", "Mail-Gateway-Filter schärfen", "Simulierte Phishing-Kampagne planen"]'::jsonb,
  'SecOps',
  21,
  ARRAY['phishing', 'awareness', 'email-security', 'mfa']
)
ON CONFLICT (code) DO UPDATE SET
  steps = EXCLUDED.steps,
  default_owner_role = EXCLUDED.default_owner_role,
  default_due_days = EXCLUDED.default_due_days,
  risk_tags = EXCLUDED.risk_tags;

-- Seed: Zugriffsmanagement – Härtung
INSERT INTO risk_mitigation_templates (code, title_de, title_en, title_sv, steps, default_owner_role, default_due_days, risk_tags)
VALUES (
  'MIT-ACCESS-01',
  'Zugriffsmanagement – Härtung',
  'Access Management – Hardening',
  'Åtkomsthantering – Härdning',
  '["Least-Privilege-Review durchführen", "Admin-Konten trennen", "Passwortrichtlinie & Rotation einführen", "Privileged Access Auditing aktivieren"]'::jsonb,
  'IT-Security',
  28,
  ARRAY['access-control', 'least-privilege', 'identity', 'audit']
)
ON CONFLICT (code) DO UPDATE SET
  steps = EXCLUDED.steps,
  default_owner_role = EXCLUDED.default_owner_role,
  default_due_days = EXCLUDED.default_due_days,
  risk_tags = EXCLUDED.risk_tags;