# Master-Passwort & Edit-Token Flow – Playbook

## Übersicht

Dieser Flow schützt kritische Organisations-Updates durch Master-Passwort-Verifizierung und kurzlebige Edit-Tokens.

### Architektur

```
┌─────────────┐    1) verify-master-pass     ┌──────────────┐
│   Frontend  │ ─────────────────────────────>│  Edge Func   │
│   Dialog    │<─────────────────────────────┤ (10min TTL)  │
└─────────────┘    editToken + ttl            └──────────────┘
      │                                              │
      │ 2) update-organization                       │
      │    + X-Org-Edit: <token>                     ▼
      ▼                                        ┌──────────────┐
┌─────────────┐                               │ org_secrets  │
│  Unternehmen│<──────────────────────────────│ • hash       │
│   Table     │    Patch approved              │ • version    │
└─────────────┘                               │ • attempts   │
                                               │ • locked_until│
                                               └──────────────┘
```

---

## 1. Edge Functions

### A. `set-master-code`

**Zweck:** Setzt oder rotiert das Master-Passwort  
**Rolle:** `admin`  
**Input:**

```json
{
  "master": "string (min 10 Zeichen)"
}
```

**Output (Success):**

```json
{
  "ok": true
}
```

**Logik:**

1. Hash-Berechnung: `SHA-256(master + pepper)`
2. Upsert in `org_secrets`:
   - `master_hash`, `version`, `failed_attempts=0`, `locked_until=null`
3. Audit-Event: `master.set`

**Fehler:**

- `400 weak_password`: < 10 Zeichen
- `401 unauthorized`: Keine Admin-Rolle

---

### B. `verify-master-pass`

**Zweck:** Verifiziert Master-Passwort, gibt Edit-Token zurück  
**Rolle:** Authentifiziert (beliebige Rolle)  
**Input:**

```json
{
  "master": "string"
}
```

**Output (Success):**

```json
{
  "ok": true,
  "editToken": "eyJ...",
  "ttl": 600
}
```

**Logik:**

1. Rate-Limit-Check: 5 Versuche / 15 min
2. Lockout-Check: `locked_until > now()` → 429
3. Hash-Vergleich
4. **Bei Erfolg:**
   - Reset: `failed_attempts=0`, `locked_until=null`
   - JWT signieren: `{tenantId, scope:"org:edit", v:<version>}`, TTL=600s
5. **Bei Fehler:**
   - Increment: `failed_attempts++`
   - Lock bei `failed_attempts >= 5`: `locked_until = now() + 15min`

**Fehler:**

| Code | Error                | Bedeutung                                |
| ---- | -------------------- | ---------------------------------------- |
| 403  | `invalid`            | Falsches Passwort                        |
| 404  | `not_set`            | Kein Master-Hash für Tenant              |
| 429  | `locked`             | Account gesperrt (zu viele Fehlversuche) |
| 429  | `rate_limited`       | Zu viele Requests                        |
| 500  | `server_error`       | Interner Fehler                          |

---

### C. `update-organization`

**Zweck:** Aktualisiert Organisations-Daten mit Edit-Token  
**Rolle:** `manager` (min)  
**Headers:**

```
Authorization: Bearer <JWT>
X-Org-Edit: <editToken>
Content-Type: application/json
```

**Input (Beispiel):**

```json
{
  "name": "New Company Name",
  "website": "https://example.com",
  "city": "Berlin"
}
```

**Erlaubte Felder:**

`name`, `legal_name`, `street`, `zip`, `city`, `country`, `sector`, `company_size`, `website`, `vat_id`

**Output (Success):**

```json
{
  "ok": true
}
```

**Logik:**

1. JWT-Rolle-Check: >= `manager`
2. Edit-Token validieren:
   - Signature prüfen
   - Payload: `scope="org:edit"`, `tenantId` match
3. Version-Check:
   - `org_secrets.version == token.v` → sonst `409 stale_token`
4. Patch `Unternehmen` Table
5. Audit-Event: `org.update`

**Fehler:**

| Code | Error                  | Bedeutung                                       |
| ---- | ---------------------- | ----------------------------------------------- |
| 400  | `no_changes`           | Keine Felder geändert                           |
| 401  | `edit_token_required`  | Header `X-Org-Edit` fehlt                       |
| 403  | `invalid_token`        | Token ungültig (Signature/Scope/Tenant)         |
| 404  | `not_found`            | Kein Secret für Tenant                          |
| 409  | `stale_token`          | Master wurde rotiert → neu verifizieren         |
| 500  | `server_error`         | DB-Fehler                                       |

---

### D. `rotate-master-code`

**Zweck:** Rotiert Master-Passwort (invalidiert alle Edit-Tokens)  
**Rolle:** `admin`  
**Input:**

```json
{
  "oldPassword": "string",
  "newPassword": "string (min 10 Zeichen)"
}
```

**Output (Success):**

```json
{
  "ok": true
}
```

**Logik:**

1. Lockout-Check (wie `verify`)
2. Altes Passwort verifizieren
3. Bei Erfolg:
   - Hash neues Passwort
   - `version++`
   - `failed_attempts=0`, `locked_until=null`
4. Audit-Event: `master.rotate`

**Fehler:**

- `400 weak_password`: < 10 Zeichen
- `403 invalid_old_password`: Altes PW falsch
- `404 master_not_set`: Noch kein Master gesetzt
- `429 locked`: Account gesperrt

---

## 2. Frontend-Integration

### A. OrganizationView (Beispiel)

```tsx
const [editToken, setEditToken] = useState<string | null>(null);
const [showMasterDialog, setShowMasterDialog] = useState(false);

const handleEditClick = () => {
  setShowMasterDialog(true);
};

const handleMasterSuccess = (token: string) => {
  setEditToken(token);
  setEditing(true);
  setShowMasterDialog(false);
};

const handleSaveEdit = async () => {
  const session = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('update-organization', {
    body: editFormData,
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token}`,
      'X-Org-Edit': editToken!,
    }
  });
  
  if (error?.message === 'stale_token') {
    toast.error('Master-Passwort wurde rotiert. Bitte neu verifizieren.');
    setShowMasterDialog(true);
    return;
  }
  
  if (data?.ok) {
    toast.success('Änderungen gespeichert');
    setEditing(false);
    setEditToken(null);
    loadCompanyData();
  }
};
```

### B. MasterPasswordDialog

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  
  const session = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('verify-master-pass', {
    body: { master: password },
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token}`
    }
  });
  
  if (error) {
    if (error.message === 'locked') {
      setError('Account gesperrt. Bitte später erneut versuchen.');
    } else if (error.message === 'invalid') {
      setError(`Ungültiges Passwort. ${data?.attempts_remaining || 0} Versuche übrig.`);
    } else {
      setError('Verifizierung fehlgeschlagen.');
    }
    setLoading(false);
    return;
  }
  
  onSuccess(data.editToken);
  handleClose();
};
```

---

## 3. Datenbank-Schema

### `org_secrets` Table

```sql
CREATE TABLE public.org_secrets (
  tenant_id uuid PRIMARY KEY REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  master_hash text NOT NULL,
  algo text NOT NULL DEFAULT 'sha256-pepper',
  version int NOT NULL DEFAULT 1,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz DEFAULT NULL,
  rotated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_org_secrets_locked 
  ON public.org_secrets(locked_until) 
  WHERE locked_until IS NOT NULL;
```

---

## 4. Smoke-Tests

### A. Master setzen

```bash
curl -sS https://eadjoqlyjxwqjfvukvqx.functions.supabase.co/set-master-code \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"master":"MySecurePassword123"}'
# Erwartet: {"ok":true}
```

### B. Verifizieren → Token erhalten

```bash
curl -sS https://eadjoqlyjxwqjfvukvqx.functions.supabase.co/verify-master-pass \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"master":"MySecurePassword123"}'
# Erwartet: {"ok":true,"editToken":"eyJ...","ttl":600}
```

### C. Update mit Token

```bash
curl -sS https://eadjoqlyjxwqjfvukvqx.functions.supabase.co/update-organization \
  -H "Authorization: Bearer <JWT>" \
  -H "X-Org-Edit: <EDIT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"website":"https://example.com"}'
# Erwartet: {"ok":true}
```

### D. Rotation

```bash
curl -sS https://eadjoqlyjxwqjfvukvqx.functions.supabase.co/rotate-master-code \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"MySecurePassword123","newPassword":"NewSecurePassword456"}'
# Erwartet: {"ok":true}
```

---

## 5. Negativ-Tests

### A. Lockout-Szenario

```bash
# 5× falsches Passwort
for i in {1..5}; do
  curl -sS https://...verify-master-pass \
    -H "Authorization: Bearer <JWT>" \
    -H "Content-Type: application/json" \
    -d '{"master":"WRONG"}'
done
# Letzter Versuch: {"ok":false,"error":"locked","locked_until":"2025-11-01T10:15:00Z"}
```

### B. Stale Token nach Rotation

```bash
# 1) Token holen
TOKEN=$(curl -sS ...verify-master-pass -d '{"master":"OLD"}' | jq -r .editToken)

# 2) Master rotieren
curl -sS ...rotate-master-code -d '{"oldPassword":"OLD","newPassword":"NEW"}'

# 3) Mit altem Token updaten → 409
curl -sS ...update-organization \
  -H "X-Org-Edit: $TOKEN" \
  -d '{"website":"https://fail.com"}'
# Erwartet: {"error":"stale_token","message":"Token expired due to password rotation"}
```

### C. Rate-Limit

```bash
# 6× in <15min verifizieren → 429
for i in {1..6}; do
  curl -sS ...verify-master-pass -d '{"master":"CORRECT"}'
done
# 6. Request: {"ok":false,"error":"rate_limited"}
```

---

## 6. Troubleshooting

### Fehler: `404 not_found` (org_secrets)

**Ursache:** Noch kein Master gesetzt  
**Fix:** `set-master-code` aufrufen

### Fehler: `409 stale_token`

**Ursache:** Master wurde rotiert  
**Fix:** Neu verifizieren (neuer Token)

### Fehler: `429 locked`

**Ursache:** 5+ Fehlversuche  
**Fix (Admin):**

```sql
UPDATE org_secrets
SET failed_attempts = 0, locked_until = NULL, updated_at = now()
WHERE tenant_id = '<UUID>';
```

### Fehler: `401 edit_token_required`

**Ursache:** Header `X-Org-Edit` fehlt  
**Fix:** Header in Request ergänzen

### Fehler: `403 invalid_token`

**Ursache:** Token-Signature ungültig, falscher Tenant, falscher Scope  
**Fix:** Neu verifizieren

---

## 7. Sicherheits-Checkliste

- [x] **Hash-Algo:** SHA-256 + Pepper (env: `MASTER_PEPPER`)
- [x] **Rate-Limit:** 5 Versuche / 15 min (KV-backed)
- [x] **Lockout:** 5 Fehlversuche → 15min Lock
- [x] **Token-TTL:** 600s (10 min)
- [x] **Version-Bump:** Rotation invalidiert alte Tokens
- [x] **Audit-Trail:** Alle Master-Operationen geloggt
- [x] **RBAC:** `set/rotate` = admin, `verify` = authenticated, `update` = manager
- [x] **CORS:** Korrekte Allow-Headers (`authorization`, `x-org-edit`)

---

## 8. Monitoring

### Logs prüfen

```bash
supabase functions logs --project-ref eadjoqlyjxwqjfvukvqx --since 1h \
  | grep -E "verify-master-pass|update-organization|rotate-master-code"
```

### DB-Metriken

```sql
-- Locked Accounts
SELECT tenant_id, locked_until, failed_attempts
FROM org_secrets
WHERE locked_until > now();

-- Version-Historie (via Audit)
SELECT created_at, payload->>'len' as pw_length
FROM audit_log
WHERE action = 'master.set'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 9. Deployment

### CI-Check (deno.json)

```json
{
  "tasks": {
    "edge-check-all": "deno check --no-lock --compact -q supabase/functions/**/index.ts"
  }
}
```

```bash
# Lokal testen
deno task edge-check-all
```

### Environment (Secrets)

```bash
# MASTER_PEPPER setzen
supabase secrets set MASTER_PEPPER="<random-64-char-string>"
```

---

## 10. Best Practices

1. **Master-Passwort:** Min 10 Zeichen, idealerweise >20 mit Sonderzeichen
2. **Rotation:** Quartalweise oder bei Verdacht auf Kompromittierung
3. **Token-Handling:** Nie im LocalStorage speichern, nur in Memory
4. **Error-Messages:** Keine Hinweise auf interne Details (z. B. "user not found")
5. **Audit:** Regelmäßig `audit_log` auf `master.*` Events prüfen
6. **Backup:** `org_secrets` Table separat backuppen (encrypted)

---

## Appendix: API-Referenz

### JWT-Payload (Edit-Token)

```json
{
  "tenantId": "uuid",
  "scope": "org:edit",
  "v": 1,
  "iat": 1730456789,
  "exp": 1730457389
}
```

### i18n-Keys (Beispiel)

```json
// public/locales/de/organization.json
{
  "master": {
    "title": "Hauptlösenord bestätigen",
    "placeholder": "Hauptlösenord",
    "fail": "Ungültiges Passwort",
    "locked": "Account gesperrt. Bitte später versuchen.",
    "stale": "Master wurde geändert. Neu verifizieren."
  }
}
```

---

**Version:** 1.0  
**Letzte Aktualisierung:** 2025-11-01  
**Autor:** System  
**Status:** Production-Ready ✅
