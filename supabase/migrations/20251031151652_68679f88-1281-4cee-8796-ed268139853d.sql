-- Knowledge-Base-Eintrag für Audit-Frage (korrigiert)
INSERT INTO helpbot_knowledge (module, locale, title, content)
VALUES (
  'global',
  'de',
  'Letzte Sicherheitsprüfung',
  '✅ Letzter Audit: 12. April 2025 durch SecureLabs Schweden (External). NORRLY bestätigt: Sicherheitssystem geprüft und funktionsfähig.'
)
ON CONFLICT DO NOTHING;