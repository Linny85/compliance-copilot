# README_DEV_AUTH_FLOW.md — NIS2-AI-GUARD

## Auth-Flow & Edge-Functions (Supabase) – kurz, belegt, wartbar

### Ziel
- Authentifizierte Edge-Function-Aufrufe mit Supabase (JWT geprüft).
- Idempotente Anlage eines Unternehmens (create-tenant) ohne 409-Fehler.
- Klare Tests, Logs, Troubleshooting.

---

## Systemüberblick
- **Auth**: Supabase JWT (Session Access Token)
- **DB**: Postgres (Supabase) mit RLS aktiv
- **Tabelle**: `"Unternehmen"` (case-sensitiv, in Anführungszeichen)
- **Policies**:

```sql
CREATE POLICY unternehmen_insert_policy
ON "Unternehmen"
FOR INSERT
WITH CHECK (erstellt_von = auth.uid());

CREATE POLICY unternehmen_select_policy
ON "Unternehmen"
FOR SELECT
USING (erstellt_von = auth.uid());
```

- **Unique-Index**:

```sql
CREATE UNIQUE INDEX uniq_unternehmen_erstellt_von
ON "Unternehmen" (erstellt_von);
```

⇒ Ein User = genau ein Unternehmen.

---

## Frontend-Aufruf (empfohlen)

Kein manuelles Header-Handling – Supabase SDK erledigt das.

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function handleFormSubmit(formData: {
  companyName?: string
  sector?: string
  size?: string
}) {
  const { data, error } = await supabase.functions.invoke('create-tenant', {
    body: {
      name: formData.companyName ?? null,
      sector: formData.sector ?? null,
      companySize: formData.size ?? null,
    },
  })

  if (error) throw error
  return data // { company: {...} }
}
```

**Warum**: `supabase.functions.invoke()` hängt das aktuelle Session-JWT automatisch an (`Authorization: Bearer <token>`). Das ist stabiler als fetch mit handgebauten Headers.

---

## Edge-Function: create-tenant (Verhalten)
- **201 Created**: Unternehmen neu angelegt.
- **200 OK**: Unternehmen existiert bereits → vorhandenen Datensatz zurückgeben.
- **401 Unauthorized**: Kein/ungültiges JWT.
- **500/400**: Unerwartete/valide Fehler (Details im JSON-Body).

Die Funktion ist **idempotent**:
- Entweder SELECT-vor-INSERT ODER INSERT mit 23505-Abfang + Rückgabe des bestehenden Datensatzes.
- Kein UPDATE nötig ⇒ vorhandene RLS-Policies (INSERT/SELECT) genügen.

---

## Minimal-Check: Wer bin ich? (whoami)

Zum schnellen Verifizieren von Header/JWT.

```typescript
// supabase/functions/whoami/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const handler = async (req: Request): Promise<Response> => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_ANON_KEY')
  const auth = req.headers.get('Authorization') ?? ''

  const sb = url && key
    ? createClient(url, key, { global: { headers: { Authorization: auth } } })
    : null

  const user = sb ? (await sb.auth.getUser()).data?.user ?? null : null

  return new Response(JSON.stringify({
    hasAuthHeader: auth.startsWith('Bearer '),
    userId: user?.id ?? null,
    email: user?.email ?? null,
    envOk: Boolean(url && key),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
```

**Deploy/Test**

```bash
supabase functions deploy whoami --no-verify-jwt=false
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://<PROJECT>.functions.supabase.co/whoami | jq
```

Erwartet: `hasAuthHeader: true`, `userId: <uid>`.

---

## Tests (End-to-End)

### 1) Direkt per cURL (mit gültigem User-JWT)

```bash
# Neu oder vorhanden (idempotent)
curl -i -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Norrland Innovate AB"}' \
  https://<PROJECT>.functions.supabase.co/create-tenant
```

Erwartet:
- Erster Call → 201 Created + `{ company: {...} }`
- Zweiter Call → 200 OK + derselbe `{ company: {...} }`

### 2) SQL-Sichtprüfung (unter RLS mit demselben Token)

```sql
select id, name, erstellt_von, created_at
from "Unternehmen"
where erstellt_von = auth.uid();
```

Erwartet: genau 1 Zeile.

---

## Deployment & Umgebungen
- **JWT-Prüfung aktiv halten**:

```bash
supabase functions deploy create-tenant --no-verify-jwt=false
```

(Wird `--no-verify-jwt` weggelassen, ist Verifikation standardmäßig aktiv.)

- **Environment-Variablen (Function Settings)**:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- **Client-Env**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## Fehlersuche (gerichtet, ohne Rätselraten)

| Symptom | Wahrscheinliche Ursache | Beleg/Prüfung | Fix |
|---------|------------------------|---------------|-----|
| "Edge Function returned non-2xx" & 401 | Kein/entfernter Auth-Header | DevTools → Network → Request Headers | Frontend auf `supabase.functions.invoke()` umstellen / sicherstellen, dass Session existiert |
| 409 (früher) | Unique-Verletzung auf `erstellt_von` | Postgres Code 23505 | Idempotente Logik (SELECT-vor-INSERT oder 23505-Abfang) – bereits umgesetzt |
| 500 "Server misconfigured" | SUPABASE_URL/ANON_KEY fehlen in Function | Function-Settings prüfen | Env setzen, neu deployen |
| 200, aber leeres Ergebnis | Falsche RLS/UID mismatch | SQL mit `auth.uid()` | Mit whoami UID prüfen, Policies wie oben |
| CORS/Proxy-Effekte | Aufruf über Dritt-Proxy strippt Header | Request-URL inspizieren | Direkte Functions-URL nutzen, nicht App-Proxy |

---

## Architektur-Kurzdiagramm (logisch)

```
[User Browser] --(Login)--> [Supabase Auth]
       |                            |
       | Session (JWT)              |
       +-- supabase.functions.invoke('create-tenant', body) -->
                                  [Edge Function (JWT Verify)]
                                           |
                                RLS: auth.uid() sichtbar
                                           |
                            INSERT (falls leer) / SELECT (falls vorhanden)
                                           |
                                       [Postgres]
                                           |
                           <-- 201 (neu) / 200 (vorhanden) --
```

---

## Qualitätsregeln
- Keine Spekulationen. Bei Fehlern stets: Statuscode, Response-Body, Function-Logs prüfen.
- Idempotenz sicherstellen, damit parallele/mehrfache Klicks keine Fehler produzieren.
- RLS strikt lassen (kein broad access) – nur INSERT/SELECT nötig.
- Logs: bei Bedarf temporär `console.log()` für userId und insertErr einbauen und nach Fix wieder entfernen.

---

## Anhang: Beispiel-Responses

### 201 Created

```json
{
  "company": {
    "id": "…",
    "name": "Norrland Innovate AB",
    "erstellt_von": "d796301e-f8fc-411d-bba5-2678a5093f58",
    "created_at": "2025-10-22T07:07:58Z"
  }
}
```

### 200 OK (bereits vorhanden)

```json
{
  "company": { "...": "..." }
}
```

### 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### 400/500 Fehlerbeispiel

```json
{ "error": "Insert failed", "details": { "...": "…" } }
```

---

**Stand**: 23.10.2025 — Inhalte basieren auf deinen bestätigten Logs/Diagnosen (RLS aktiv, Unique-Index vorhanden, ein existierender Datensatz).
