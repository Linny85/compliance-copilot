-- Test-Seeds für E2E & Entwicklung
-- Hinweis: Anpassen an tatsächliches Schema und RLS-Policies

-- Demo-Tenant (Unternehmen)
INSERT INTO "Unternehmen" (id, name, sector, country, subscription_status)
VALUES 
  ('demo-tenant-id', 'Demo Tenant', 'technology', 'DE', 'trial')
ON CONFLICT (id) DO NOTHING;

-- Beispiel-Profil (Annahme: profiles.user_id -> Unternehmen.id)
-- WICHTIG: user_id durch echte Test-User-ID ersetzen oder Auth-User anlegen
-- INSERT INTO profiles (user_id, company_id)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'demo-tenant-id')
-- ON CONFLICT (user_id) DO UPDATE SET company_id = EXCLUDED.company_id;

-- Mitigation-Templates (falls Tabelle existiert)
-- Falls die Tabelle nicht existiert, SQL anpassen oder Migration erstellen
-- INSERT INTO mitigation_templates
--   (code, title_de, title_en, title_sv, risk_tags, default_owner_role, default_due_days, steps)
-- VALUES
-- ('NIS2-BKP-001','Backup-Härtung','Backup Hardening','Säkerhetskopiering härdning',
--   ARRAY['backup','ransomware'],'IT-Admin',14,
--   '["Backup-Plan dokumentieren","Immutable Storage aktivieren","Recovery-Test durchführen"]'),
-- ('AI-LOG-001','KI-Logging etablieren','Establish AI Logging','Införa AI-loggning',
--   ARRAY['ai_act','logging'],'Data Officer',21,
--   '["Log-Pfade definieren","Retention & Zugriff prüfen","Monitoring-Alarm setzen"]')
-- ON CONFLICT (code) DO NOTHING;

-- Optional: Framework-Compliance-Dummy-Daten
-- INSERT INTO framework_scores (tenant_id, framework, score)
-- VALUES 
--   ('demo-tenant-id','NIS2',0.42),
--   ('demo-tenant-id','AI_ACT',0.15),
--   ('demo-tenant-id','GDPR',0.30)
-- ON CONFLICT (tenant_id, framework) DO UPDATE SET score = EXCLUDED.score;
