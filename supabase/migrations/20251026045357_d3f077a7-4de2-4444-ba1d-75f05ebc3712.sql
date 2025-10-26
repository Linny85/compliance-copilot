-- Seed: Beispiel-Frameworks und Controls für Demo
-- Idempotent ausführbar

-- 0) Unique constraints sicherstellen (müssen vor ON CONFLICT existieren)
CREATE UNIQUE INDEX IF NOT EXISTS ux_frameworks_code ON frameworks (code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_controls_code ON controls (code);

-- 1) Frameworks sicherstellen
INSERT INTO frameworks (id, code, title, version, description)
VALUES 
  (gen_random_uuid(), 'NIS2', 'NIS2 – Richtlinie (2023)', '1.0', 'EU-Richtlinie zur Netz- und Informationssicherheit'),
  (gen_random_uuid(), 'AI_ACT', 'AI Act', '1.0', 'EU-Verordnung zur Regulierung künstlicher Intelligenz'),
  (gen_random_uuid(), 'GDPR', 'GDPR / DSGVO', '1.0', 'Datenschutz-Grundverordnung')
ON CONFLICT (code) DO UPDATE 
  SET title = EXCLUDED.title,
      version = EXCLUDED.version,
      description = EXCLUDED.description;

-- 2) Controls anlegen (global, ohne tenant_id)
WITH fw_ids AS (
  SELECT id, code FROM frameworks WHERE code IN ('NIS2', 'AI_ACT', 'GDPR')
)
INSERT INTO controls (id, framework_id, code, title, objective, severity, evidence_types)
SELECT 
  gen_random_uuid(),
  fw.id,
  vals.code,
  vals.title,
  vals.objective,
  vals.severity,
  vals.evidence_types
FROM (
  VALUES 
    ('NIS2', 'NIS2-01', 'Risikomanagement', 'Implementierung eines systematischen Risikomanagement-Prozesses gemäß NIS2', 'high', ARRAY['policy', 'assessment']::text[]),
    ('AI_ACT', 'AI-01', 'Daten-Governance', 'Sicherstellung der Datenqualität und -governance für KI-Systeme', 'high', ARRAY['policy', 'documentation']::text[]),
    ('GDPR', 'GDPR-03', 'Betroffenenrechte', 'Gewährleistung der Rechte betroffener Personen nach DSGVO Art. 15-22', 'medium', ARRAY['process', 'documentation']::text[])
) AS vals(fw_code, code, title, objective, severity, evidence_types)
JOIN fw_ids fw ON fw.code = vals.fw_code
ON CONFLICT (code) DO UPDATE 
  SET title = EXCLUDED.title,
      objective = EXCLUDED.objective,
      severity = EXCLUDED.severity,
      evidence_types = EXCLUDED.evidence_types,
      framework_id = EXCLUDED.framework_id;