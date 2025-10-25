# Training Certificates Module

## Übersicht
Ermöglicht Mitarbeitern das Hochladen von Schulungszertifikaten zur Compliance-Nachweispflicht. Superadmins verifizieren/ablehnen die Zertifikate.

## Feature-Flag
```env
VITE_FEATURE_TRAINING_CERTS=false  # Default: deaktiviert
```

## Sicherheitsarchitektur

### Datenbank
- **Tabelle:** `training_certificates`
- **Spalten:**
  - `file_path`: Relativer Pfad im Storage (NICHT public URL)
  - `training_tag`: Stabiler Schlüssel für Mapping (z.B. 'nis2_basics')
  - `retention_until`: GDPR-konforme Aufbewahrungsfrist (7 Jahre)
- **Storage Bucket:** `training-certificates` (private)
- **RLS:** 
  - Tenant-isoliert via `get_user_company(auth.uid())`
  - Upload nur für eigene User-ID
  - Verifizierung: Admin/Master_Admin
  - Löschen: Nur Master_Admin
- **Indizes:** tenant_id, user_id, status, training_tag (Performance)

### Storage Security
- Private Bucket → **keine** public URLs
- Signierte URLs (1h TTL) für Downloads
- Pfadstruktur: `{user_id}/{uuid}.{ext}`
- RLS auf storage.objects für zusätzliche Isolation

### GDPR & Compliance
- **Retention:** 7 Jahre Aufbewahrung, dann automatisches Löschen
- **Datenminimierung:** Nur notwendige Felder (Titel, Anbieter, Datum, Datei)
- **Löschrechte:** Delete-Flow löscht DB + Storage-Datei
- **Audit-Trail:** Verifizierungsereignisse werden in audit_log geloggt

## Rollen
- **Alle User:** Upload für sich selbst, Ansicht im eigenen Tenant
- **Admin/Master Admin:** Verifizierung, Ablehnung
- **Master Admin:** Löschen

## UI-Komponenten
- **Dashboard Widget:** `/dashboard` (zeigt empfohlene Schulungen mit Status)
- **Upload Dialog:** Dropdown mit vordefinierten Schulungen + Freitext
- **Admin Review:** `/admin/training-certificates` (Tabelle mit signiertem Download)

## Training Tags (stabile Zuordnung)
- `nis2_basics` → NIS2 Grundlagen
- `ai_act_awareness` → EU AI Act Awareness  
- `gdpr_basics` → DSGVO Basis

## API-Hooks
- `useTrainingCertificates()`: Liste aller Zertifikate im Tenant
- `useUserTrainingCertificates(userId)`: Zertifikate eines Users
- `useCreateTrainingCertificate()`: Upload mit file_path
- `useVerifyTrainingCertificate()`: Admin-Verifizierung
- `useDeleteTrainingCertificate()`: Master_Admin-Löschen
- `useSignedUrl(bucket, path)`: Signierte URL-Generierung (auto-refresh 5min vor Ablauf)

## Rollback
Feature-Flag auf `false` setzen → UI & Score-Einfluss deaktiviert, DB bleibt erhalten.

## Deployment-Checklist
1. ✅ Migration ausgeführt (file_path, training_tag, retention_until)
2. ✅ RLS Policies mit helper functions (get_user_company, has_role)
3. ✅ Storage Policies (private bucket, signierte URLs)
4. ✅ Indizes angelegt
5. ⚠️ ENV-Variable `VITE_FEATURE_TRAINING_CERTS=true` setzen
6. ⚠️ Testen: Upload → Admin-Verifizierung → signierter Download

## Known Issues / Future Improvements
- [ ] Automatisches Löschen nach retention_until via Cron Job
- [ ] E-Mail-Benachrichtigung an User bei Verifizierung/Ablehnung
- [ ] OCR für automatische Zertifikatsprüfung (optional)
- [ ] Multi-File-Upload (mehrere Zertifikate gleichzeitig)
