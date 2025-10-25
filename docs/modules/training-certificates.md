# Training Certificates Module

## Übersicht
Ermöglicht Mitarbeitern das Hochladen von Schulungszertifikaten zur Compliance-Nachweispflicht. Superadmins verifizieren/ablehnen die Zertifikate.

## Feature-Flag
```env
VITE_FEATURE_TRAINING_CERTS=false  # Default: deaktiviert
```

## Datenbank
- **Tabelle:** `training_certificates`
- **Storage Bucket:** `training-certificates` (private)
- **RLS:** Tenant-isoliert, nur Admins verifizieren

## Rollen
- **Alle User:** Upload für sich selbst, Ansicht im eigenen Tenant
- **Admin/Master Admin:** Verifizierung, Ablehnung, Löschen

## Routes
- Dashboard: `/dashboard` (Widget wenn Flag=true)
- Admin: `/admin/training-certificates`

## Rollback
Feature-Flag auf `false` setzen → UI & Score-Einfluss deaktiviert, DB bleibt erhalten.
