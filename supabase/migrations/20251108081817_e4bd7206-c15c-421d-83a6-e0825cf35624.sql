-- Maßnahmen-Vorlagen (mehrsprachig)
CREATE TABLE IF NOT EXISTS risk_mitigation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title_de TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_sv TEXT NOT NULL,
  body_de TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_sv TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  severity TEXT CHECK (severity IN ('low','medium','high')) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rmt_code ON risk_mitigation_templates(code);
CREATE INDEX IF NOT EXISTS idx_rmt_tags ON risk_mitigation_templates USING gin (tags);

GRANT SELECT ON risk_mitigation_templates TO authenticated;

-- Optional: Mapping Risiko-Vorlage → empfohlene Maßnahmen
CREATE TABLE IF NOT EXISTS risk_template_mitigations (
  risk_template_code TEXT NOT NULL,
  mitigation_code TEXT NOT NULL,
  PRIMARY KEY (risk_template_code, mitigation_code)
);

GRANT SELECT ON risk_template_mitigations TO authenticated;

-- Seed-Beispiele
INSERT INTO risk_mitigation_templates (code, title_de, title_en, title_sv, body_de, body_en, body_sv, tags, severity) VALUES
('M-ACCESS-001', 'MFA für kritische Systeme', 'MFA for critical systems', 'MFA för kritiska system',
 '• MFA für Admin- und Remote-Zugänge aktivieren
• Policy dokumentieren
• Rollout terminieren',
 '• Enable MFA for admin/remote access
• Document policy
• Schedule rollout',
 '• Aktivera MFA för admin/fjärråtkomst
• Dokumentera policy
• Planera införande',
 ARRAY['NIS2','Access','Art21'], 'high'),

('M-BACKUP-002', '3-2-1 Backup-Strategie', '3-2-1 Backup Strategy', '3-2-1 Säkerhetskopiering',
 '• 3 Kopien, 2 Medien, 1 Offsite
• Restore-Test vierteljährlich
• Backup-Plan freigeben',
 '• 3 copies, 2 media, 1 offsite
• Quarterly restore test
• Publish backup plan',
 '• 3 kopior, 2 media, 1 offsite
• Återställningstest kvartalsvis
• Publicera backupplan',
 ARRAY['NIS2','Resilience'], 'medium'),

('M-PATCH-003', 'Patch-Management-Prozess', 'Patch Management Process', 'Patch-hanteringsprocess',
 '• Kritische Patches innerhalb 48h
• Standard-Patches innerhalb 30 Tagen
• Patch-Policy veröffentlichen',
 '• Critical patches within 48h
• Standard patches within 30 days
• Publish patch policy',
 '• Kritiska patchar inom 48h
• Standardpatchar inom 30 dagar
• Publicera patch-policy',
 ARRAY['NIS2','Vulnerability','Art21'], 'high'),

('M-INCIDENT-004', 'Incident Response Team', 'Incident Response Team', 'Incidenthanteringsteam',
 '• IR-Team benennen (mind. 3 Personen)
• Rollen und Verantwortlichkeiten festlegen
• Erreichbarkeit 24/7 sicherstellen',
 '• Designate IR team (min. 3 persons)
• Define roles and responsibilities
• Ensure 24/7 availability',
 '• Utse IR-team (minst 3 personer)
• Definiera roller och ansvar
• Säkerställ 24/7 tillgänglighet',
 ARRAY['NIS2','Incident','Art23'], 'high'),

('M-ENCRYPT-005', 'Verschlüsselung sensibler Daten', 'Encrypt Sensitive Data', 'Kryptera känslig data',
 '• Daten im Transit verschlüsseln (TLS 1.2+)
• Daten at Rest verschlüsseln (AES-256)
• Schlüssel-Management etablieren',
 '• Encrypt data in transit (TLS 1.2+)
• Encrypt data at rest (AES-256)
• Establish key management',
 '• Kryptera data under överföring (TLS 1.2+)
• Kryptera data i vila (AES-256)
• Etablera nyckelhantering',
 ARRAY['NIS2','Encryption','GDPR'], 'high'),

('M-TRAIN-006', 'Security Awareness Training', 'Security Awareness Training', 'Säkerhetsmedvetenhetsträning',
 '• Jährliches Training für alle Mitarbeiter
• Phishing-Simulationen quartalsweise
• Trainingsnachweis dokumentieren',
 '• Annual training for all employees
• Quarterly phishing simulations
• Document training completion',
 '• Årlig utbildning för alla medarbetare
• Kvartalsvis phishing-simulering
• Dokumentera genomförd träning',
 ARRAY['NIS2','Training','Art21'], 'medium')
ON CONFLICT (code) DO NOTHING;