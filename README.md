# Compliance Copilot — EU NIS2 & AI Act Compliance Automation

Ein Produkt von Norrland Innovate AB  
Borgvattnet 212  
84495 Stugun, Schweden

## Überblick

Der Compliance Copilot ist eine spezialisierte SaaS-Plattform zur Unterstützung bei der Umsetzung von:

- NIS2-Richtlinie
- EU AI Act
- GDPR/DSGVO
- weiteren sicherheitsrelevanten Vorgaben

Weitere Dokumentation folgt.

## Lizenz- und Origin-Schutz

- **Mandanten-Lizenzmodell:** Die Supabase-Migration `20251110091545_7f5a8e9c-4fbc-4ce5-a3c1-7dd0a9ab90c5.sql` legt die Tabelle/View `tenant_license` (basierend auf `Unternehmen`) mit Feldern für Tier, Ablaufdatum, erlaubte Origins und Notizen an. Alle Lizenzabfragen laufen über diese Quelle.
- **Edge-Funktion-Throughput:** Jeder öffentlich erreichbare Endpoint nutzt `requireUserAndTenant`, den Origin-Guard (`assertOrigin`) und den Lizenzprüfer (`assertLicense`/`getLicenseStatus`), bevor Requests an service-role Queries oder AI-Systeme weitergegeben werden.
- **Statusoberfläche:** Der Edge Function `license-status` beantwortet `GET /functions/v1/license-status` und liefert den aktuellen Lizenzzustand. Das Frontend konsumiert den Endpoint über den Hook `useTenantLicense` und zeigt Badge + Warnhinweise (`TenantLicenseBadge`, `TenantLicenseNotice`) in `AppLayout` an.

Diese Mechanismen erlauben es, Mandanten ohne aktive Lizenz oder mit ungeklärten Origins konsequent zu blocken, ohne zusätzliche Secrets oder service-role Keys im Browser zu exponieren.
