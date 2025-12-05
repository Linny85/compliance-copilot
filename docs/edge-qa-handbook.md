# Edge QA Handbuch (Teil 2)

## 🎯 Übersicht

Dieses Handbuch beschreibt die **QA-Pipeline für Edge Functions, Frontend-Guards, i18n, RBAC/RLS und Security-Header** im NORRLY-Projekt. Es definiert:

- **Automatisierte Checks** (CI + lokal)
- **Phasen-basierte Tests** (Redirects, i18n, Phase 3 RBAC, Phase 4 Security)
- **Fix-Playbooks** für häufige Fehler
- **Artefakte & Reporting**

---

## 📂 Verzeichnisstruktur

```
.
├── .github/workflows/
│   ├── edge-check.yml          # CI: Deno-Build-Gate
│   └── qa-runner.yml           # CI: QA Suite (auth/unauth)
├── scripts/
│   ├── edge-triage.mjs         # Lokalisiert erste Fehler je Function
│   ├── edge-quarantine.mjs     # Verschiebt kaputte Functions nach _disabled/
│   ├── run-qa.mjs              # Orchestriert QA-Phasen 1–4
│   └── i18n-check.mjs          # Prüft de/en/sv-Schlüssel (bricht Build)
├── supabase/functions/
│   ├── _shared/utils/auth.ts   # RBAC-Helper (requireRole, getClaims, ...)
│   └── ...
├── qa/
│   ├── tasks/part2.tasks.json  # Phase-Definitionen (redirects, i18n, phase3, phase4)
│   ├── tasks/phase4.headers.json # CSP/COOP/COEP/Permissions-Policy-Erwartungen
│   ├── reports/                # Phase-Reports (redirects/*, i18n/*, phase3/*, phase4/*)
│   └── bundles/                # Zusammengefasste Bundles (qa-bundle-{auth|unauth}-*.json)
└── docs/
    ├── qa-fix-snippets.md      # Snippets für Guards, i18n, RLS, etc.
    └── edge-qa-handbook.md     # Dieses Dokument
```

---

## 🚀 Standard-Kommandos

### Lokal

```bash
# Edge Functions prüfen (Deno)
npm run edge:check
# oder
deno task edge-check-all

# Kaputte Functions temporär disablen
npm run edge:quarantine

# i18n-Schlüssel prüfen (de/en/sv)
npm run i18n:check

# QA Suite fahren
npm run qa:auth         # mit Auth-Cookie
npm run qa:unauth       # ohne Auth
npm run qa:run          # beide Profile
```

### CI (GitHub Actions)

- **edge-check.yml**: läuft bei PRs gegen `supabase/functions/**`
- **qa-runner.yml**: manuell oder täglich (`schedule: 0 4 * * *`)

---

## 🧩 QA-Phasen

Die QA Suite (`run-qa.mjs`) führt 4 Phasen aus:

| Phase        | Route                            | Prüft                                  | Artefakte                          |
| ------------ | -------------------------------- | -------------------------------------- | ---------------------------------- |
| **redirects** | `/admin/test-mode/redirects`     | Guards (auth/unauth), 200/302/403      | `qa/reports/redirects/{auth\|unauth}-*.json` |
| **i18n**     | `/admin/test-mode/i18n`          | de/en/sv Schlüssel, Variablen-Konsistenz | `qa/reports/i18n/{auth\|unauth}-*.json`     |
| **phase3**   | `/admin/test-mode/phase3`        | RBAC (JWT-Rollen), RLS (Tenant-Isolation) | `qa/reports/phase3/{auth\|unauth}-*.json`   |
| **phase4**   | `/admin/test-mode/phase4`        | Security-Header (CSP, COOP, COEP, etc.) | `qa/reports/phase4/{auth\|unauth}-*.json`   |

Nach allen Phasen: **Bundle** (`qa/bundles/qa-bundle-{profile}-{timestamp}.json`) + **JUnit XML** (`qa-junit-{profile}-*.xml`).

---

## ✅ Erwartete Ergebnisse

### Phase: Redirects

#### Auth-Profil

```json
{
  "label": "Dashboard",
  "path": "/dashboard",
  "status": 200,
  "ok": true,
  "tag": "ok"
}
```

#### Unauth-Profil

```json
{
  "label": "Dashboard (unauth)",
  "path": "/dashboard",
  "status": 302,
  "location": "/auth",
  "tag": "rx"
}
```

**Grün:** `tag: "ok"` oder `tag: "rx"` (je nach `expect`).  
**Rot:** `tag: "err"` → Guard fehlt oder falsch konfiguriert.

---

### Phase: i18n

**Grün:**

```json
{
  "lang": "de",
  "ns": "dashboard",
  "status": "ok",
  "keyCount": 42,
  "varIssues": []
}
```

**Rot:**

```json
{
  "lang": "de",
  "ns": "dashboard",
  "status": "error",
  "keyCount": 40,
  "varIssues": [
    {
      "key": "welcomeMsg",
      "base": ["userName"],
      "trans": [],
      "missing": ["userName"]
    }
  ]
}
```

→ **Fix:** Fehlende Schlüssel in `public/locales/de/dashboard.json` ergänzen, Variable `{{userName}}` prüfen.

---

### Phase: Phase 3 (RBAC/RLS)

**Grün (RBAC):**

```json
{
  "label": "Create Rule (manager)",
  "path": "/api/create-rule",
  "status": 200,
  "ok": true
}
```

**Rot (fehlende Rolle):**

```json
{
  "label": "Create Rule (viewer)",
  "status": 403,
  "ok": false
}
```

→ **Fix:** Edge Function muss `requireRole(req, 'manager')` prüfen.

**Grün (RLS):**

```json
{
  "table": "check_rules",
  "tenantColumn": "tenant_id",
  "canSelect": true,
  "canInsert": true,
  "isolation": "ok"
}
```

**Rot (RLS aus):**

```json
{
  "table": "evidences",
  "rlsEnabled": false,
  "isolation": "LEAK"
}
```

→ **Fix:** `ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;` + Policies.

---

### Phase: Phase 4 (Security-Header)

**Grün:**

```json
{
  "header": "content-security-policy",
  "present": true,
  "value": "default-src 'self'; script-src 'self' ...",
  "mustInclude": ["default-src", "script-src", "frame-ancestors"],
  "ok": true
}
```

**Rot:**

```json
{
  "header": "cross-origin-opener-policy",
  "present": false,
  "mustInclude": ["same-origin"],
  "ok": false
}
```

→ **Fix:** Reverse-Proxy (Nginx/Vercel) konfigurieren.

---

## 🛠️ Fix-Playbooks

### 1. Guards (ProtectedRoute)

**Problem:** Flash-then-Redirect (200 → 302).

**Diagnose:**

```json
{
  "label": "Dashboard (unauth)",
  "path": "/dashboard",
  "status": 200,
  "expect": "302->/auth",
  "tag": "err"
}
```

**Fix:** `ProtectedRoute` muss `authReady` abwarten:

```tsx
// src/components/guards/ProtectedRoute.tsx
export default function ProtectedRoute({ authReady, isAuthed, minRole, hasRole, redirectTo = '/auth', children }: Props) {
  if (authReady === null) return null;  // Loading
  if (!isAuthed) return <Navigate to={redirectTo} replace />;
  if (hasRole && minRole && !hasRole(minRole)) return <Navigate to="/403" replace />;
  return children ? <>{children}</> : <Outlet />;
}
```

**In App.tsx:**

```tsx
if (i18nReady === null || authReady === null) return null;

<Route path="/dashboard" element={
  <ProtectedRoute authReady={authReady} isAuthed={isAuthed} hasRole={hasRole} minRole="member">
    <Dashboard />
  </ProtectedRoute>
} />
```

---

### 2. i18n (fehlende Schlüssel / Variable-Mismatch)

**Problem:**

```json
{
  "key": "dashboard.welcomeMsg",
  "base": ["userName"],
  "trans": [],
  "missing": ["userName"]
}
```

**Fix:**

```diff
// public/locales/de/dashboard.json
{
-  "welcomeMsg": "Willkommen!"
+  "welcomeMsg": "Willkommen, {{userName}}!"
}
```

**Validierung:** `npm run i18n:check` (bricht Build bei Abweichungen).

---

### 3. RBAC (Edge Functions)

**Problem:** Viewer kann `/create-rule` aufrufen (erwartet: 403).

**Diagnose:**

```json
{
  "label": "Create Rule (viewer)",
  "status": 200,
  "expect": [403],
  "tag": "err"
}
```

**Fix:**

```ts
// supabase/functions/create-rule/index.ts
import { requireRole } from '../_shared/utils/auth.ts';

Deno.serve(async (req) => {
  const guard = requireRole(req, 'manager');
  if (guard) return guard;

  // Business-Logik
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
});
```

---

### 4. RLS (Tenant-Isolation)

**Problem:**

```json
{
  "table": "evidences",
  "rlsEnabled": false,
  "isolation": "LEAK"
}
```

**Fix (idempotent):**

```sql
-- supabase/migrations/..._rls_evidences.sql
select public.enforce_tenant_rls('public.evidences'::regclass, 'tenant_id');
create index if not exists idx_evidences_tenant on public.evidences(tenant_id);
```

**Helper-Funktion (bereits in Projekt):**

```sql
-- supabase/migrations/99999999999999_rls_helpers.sql
create or replace function public.enforce_tenant_rls(tbl regclass, tenant_col text)
returns void language plpgsql security definer set search_path = public as $$
begin
  execute format('alter table %s enable row level security', tbl);
  -- Policies: SELECT, INSERT, UPDATE, DELETE
  ...
end;
$$;
```

---

### 5. Security-Header (Phase 4)

**Problem:**

```json
{
  "header": "cross-origin-opener-policy",
  "present": false,
  "mustInclude": ["same-origin"],
  "ok": false
}
```

**Fix (Nginx):**

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-$request_id'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.postmarkapp.com; frame-ancestors 'none'" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Content-Type-Options "nosniff" always;
```

**Fix (Vercel):**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'nonce-__NONCE__'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.postmarkapp.com; frame-ancestors 'none';" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=()" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

---

## 🔍 Troubleshooting

### Edge Functions kompilieren nicht (`deno check` fails)

**Symptom:**

```
error: TS2339 [ERROR]: Property 'readFileSync' does not exist on type 'typeof Deno'.
```

**Ursache:** Node-API (`fs`, `crypto`, `path`) in Edge-Function verwendet.

**Fix:**

- `crypto` → `crypto.subtle` (Web Crypto API)
- `fs.readFileSync` → `Deno.readTextFile` (nur lokal; in Edge: `fetch`)
- `path.join` → `new URL('./file', import.meta.url)`

**Validierung:**

```bash
npm run edge:check
```

---

### QA-Tests schlagen fehl (ECONNREFUSED, 0 status)

**Symptom:**

```json
{
  "label": "Dashboard",
  "status": 0,
  "ok": false
}
```

**Ursache:** `QA_BASE_URL` falsch oder Server nicht erreichbar.

**Fix:**

```bash
export QA_BASE_URL=https://app.compliance-copilot.example
export QA_AUTH_COOKIE="sb-access-token=..."
npm run qa:auth
```

---

### i18n-Check bricht Build

**Symptom:**

```
❌ de/dashboard: Missing keys: welcomeMsg
```

**Fix:** Schlüssel in `public/locales/de/dashboard.json` ergänzen.

**Bypass (nicht empfohlen):**

```json
// package.json
{
  "scripts": {
    "prebuild": "echo 'Skip i18n check'"
  }
}
```

---

### Phase 4: Header fehlen, aber Vercel-Config korrekt

**Ursache:** Header werden nur bei **Production-Deployment** gesetzt (Preview-Builds oft ohne).

**Validierung:**

```bash
curl -I https://your-app.vercel.app | grep -i "cross-origin"
```

**Fix:** Vercel-Config prüfen (`vercel.json` im Root), `vercel --prod` deployen.

---

## 📊 Artefakte & Reporting

### Bundle-JSON (Beispiel)

```json
{
  "profile": "auth",
  "timestamp": "2025-01-22T14:30:00.000Z",
  "phases": {
    "redirects": {
      "total": 10,
      "ok": 9,
      "rx": 0,
      "err": 1,
      "results": [ ... ]
    },
    "i18n": {
      "total": 60,
      "ok": 58,
      "err": 2
    },
    "phase3": {
      "rbac": { "ok": 12, "err": 1 },
      "rls": { "ok": 5, "leak": 1 }
    },
    "phase4": {
      "headers": { "ok": 5, "missing": 1 }
    }
  },
  "summary": {
    "total": 93,
    "ok": 89,
    "err": 4
  }
}
```

### JUnit-XML (für CI)

```xml
<testsuite name="QA Suite (auth)" tests="93" failures="4" time="12.34">
  <testcase classname="redirects" name="Dashboard" time="0.12" />
  <testcase classname="redirects" name="Ops (unauth)" time="0.08">
    <failure message="Expected 302, got 200" />
  </testcase>
  ...
</testsuite>
```

---

## 📋 Cheatsheet

| Befehl                     | Zweck                                  |
| -------------------------- | -------------------------------------- |
| `npm run edge:check`       | Prüft alle Edge Functions (Deno)      |
| `npm run edge:quarantine`  | Verschiebt kaputte Functions           |
| `npm run i18n:check`       | Validiert de/en/sv-Schlüssel           |
| `npm run qa:auth`          | QA mit Auth-Cookie                     |
| `npm run qa:unauth`        | QA ohne Auth                           |
| `deno task edge-check-all` | Wie `edge:check`, direkt über Deno     |
| `deno task edge-lint`      | Linting für Edge Functions             |

---

## 🔗 Anhänge

### A) Nginx: Header komplett

```nginx
server {
  listen 443 ssl http2;
  server_name your-app.com;

  # Security-Header
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-$request_id'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.postmarkapp.com; frame-ancestors 'none'" always;
  add_header Cross-Origin-Opener-Policy "same-origin" always;
  add_header Cross-Origin-Embedder-Policy "require-corp" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header X-Content-Type-Options "nosniff" always;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### B) Curl-Tests (lokal)

```bash
# Phase 1: Redirects
curl -i http://localhost:5173/dashboard
# Erwartet: 302 → /auth (unauth) oder 200 (auth)

# Phase 4: Header
curl -I https://your-app.com | grep -E "content-security|cross-origin"
```

---

## 📄 Zusammenfassung

Dieses Handbuch deckt:

1. **Edge-Check** (Deno): `edge:check`, `edge:quarantine`
2. **i18n-Validierung**: `i18n:check`
3. **QA-Phasen** (1–4): Guards, i18n, RBAC/RLS, Security-Header
4. **Fix-Playbooks** für häufige Fehler
5. **CI-Integration** (`.github/workflows/`)
6. **Artefakte** (Bundles, JUnit-XML)

**Nächster Schritt:**

```bash
npm run qa:auth && npm run qa:unauth
```

→ Bundles teilen → gezielte Diffs bekommen. 🚀
