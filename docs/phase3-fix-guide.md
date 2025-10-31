# Phase 3 Fix-Kit: Edge Functions · RBAC · RLS

**Test-Seite:** `/admin/test-mode/phase3` (nur mit `VITE_TEST_MODE=1`)

---

## Wie du testest

1. **Eingeloggt (member/manager/admin)** → `/admin/test-mode/phase3` → *Tests starten*
2. **Unauth (Inkognito)** → Seite erneut öffnen → *Tests starten*
3. Lies die **Legende** (✅/⚠️/❌) + Stats und exportiere **JSON**

---

## A) Edge Functions (Status + RBAC)

**Ziel-Logik (Best Practice):**

* `401 Unauthorized` → nicht eingeloggt
* `403 Forbidden` → eingeloggt, aber Rolle fehlt
* `200 OK` → alles gut

**Typische Befunde → Fix:**

| Befund                               | Ursache                                      | Fix                                                                    |
| ------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------- |
| ❌ `200` obwohl Rolle < `minRole`     | Rollenprüfung fehlt                          | `assertRoleAtLeast()` vor Logik einbauen                               |
| ⚠️ Rolle ≥ `minRole`, aber `401/403` | Verwechslung der Rollenquelle / Header fehlt | Prüfe Rollenquelle (JWT `app_metadata.roles`) & `Authorization` Header |
| ❌ `0` oder `redirect`                | Pfad/Method/CORS falsch                      | Prüfe `path` in `FN_CASES`, Methode (POST/GET), CORS/Route             |

**Edge-Function Template (Deno, minimal):**

```ts
// _shared/utils/auth.ts
export function getClaims(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return null;
  const [, payload] = jwt.split('.');
  const json = JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));
  return json;
}

const ORDER = ['viewer','member','manager','admin'] as const;
export function hasRoleAtLeast(roles: string[]|undefined, need: typeof ORDER[number]) {
  const r = roles?.[0] ?? 'viewer';
  return ORDER.indexOf(r) >= ORDER.indexOf(need);
}

// functions/create-rule/index.ts
import { getClaims, hasRoleAtLeast } from '../_shared/utils/auth.ts';

Deno.serve(async (req) => {
  const claims = getClaims(req);
  if (!claims) return new Response('Unauthorized', { status: 401 });

  const roles = claims?.app_metadata?.roles as string[] | undefined;
  if (!hasRoleAtLeast(roles, 'manager')) {
    return new Response('Forbidden', { status: 403 });
  }

  // … eigentliche Logik …
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
});
```

> **WICHTIG:** Sende **niemals** einen 200-Status mit Fehlertext. Nutze echte `401/403`.

---

## B) RLS-Spot-Checks (Tenant-Isolation)

**Ziel:** Keine Zeilen mit *fremdem* `tenant_id`.

**Standard-Policies (Supabase / Postgres):**

```sql
-- 1) RLS aktivieren
alter table public.check_rules enable row level security;

-- 2) Helper-Funktion für tenant_id aus JWT
create or replace function public.jwt_tenant_id()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenant_id'
$$;

-- 3) SELECT nur eigener Tenant
create policy "s_check_rules_tenant"
on public.check_rules
for select
using (tenant_id::text = public.jwt_tenant_id());

-- 4) INSERT nur in eigenen Tenant
create policy "i_check_rules_tenant"
on public.check_rules
for insert
with check (tenant_id::text = public.jwt_tenant_id());

-- 5) UPDATE nur eigener Tenant
create policy "u_check_rules_tenant"
on public.check_rules
for update
using (tenant_id::text = public.jwt_tenant_id())
with check (tenant_id::text = public.jwt_tenant_id());
```

> Wiederhole analog für `evidences`, `audit_tasks` und alle Tenant-Tabellen.

**Leck weiterhin da?**

* Prüfe: Alle Zugriffe über **RLS-geschützte Tabellen** (keine `security definer` RPCs die RLS umgehen)
* Edge-Functions: **Service-Role nur für Admin-Tasks**, nie für Endnutzer-Reads (Service-Key umgeht RLS!)
* Für Endnutzer: **immer** `anon`/User-JWT verwenden

---

## FN_CASES erweitern

```ts
{
  label: 'delete-evidence',
  path:  '/functions/v1/delete-evidence',
  method:'POST',
  expect:[200,403,401],
  minRole:'manager',
  notes: 'Manager darf löschen; member → 403; unauth → 401'
}
```

## RLS_TABLES erweitern

```ts
{ 
  table: 'systems', 
  tenantColumn: 'tenant_id', 
  selectCols: ['id','tenant_id','name'], 
  sampleLimit: 50 
}
```

---

## Quick-Troubleshooting

* **Edge-Function ❌ bei Unauth mit `200`:** Rolle prüfen + `401` senden
* **Edge-Function ⚠️ bei Manager/Admin:** `app_metadata.roles` im JWT gesetzt? (`JWT_ROLE_CLAIM_PATH`)
* **RLS ❌ Foreign rows > 0:** Policy fehlt/falsch; prüfe `USING`/`WITH CHECK` und `jwt_tenant_id()`
* **RLS ⚠️ Unauth sieht Daten:** Endpoint nutzt Service-Key oder public-View ohne RLS → korrigieren

---

## Workflow

1. Tests ausführen (auth & unauth)
2. **Export JSON** mit Findings
3. Fixes anwenden (SQL-Policies, Edge-Function-Guards)
4. Re-Test → ✅ alle grün
