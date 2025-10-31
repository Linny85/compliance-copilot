# Phase 3 Upgrades & Next Steps

## Quick Upgrades

### 1) Fail-Triage Hints

```ts
function triageHint(p: { got:number; expect:number[]; minRole?:string }, isAuthed:boolean) {
  const { got, expect, minRole } = p;
  if (!expect.includes(got)) return 'Unerwarteter HTTP-Status → Function-Handler prüfen (401/403/200-Konvention).';
  if (!isAuthed && minRole && got === 200) return 'Unauth erhielt 200 → fehlende Auth-Prüfung in Edge Function.';
  if (isAuthed && minRole && (got === 401 || got === 403)) return 'Rolle ≥ minRole erwartet → RBAC/Policy/Claim prüfen.';
  return '';
}
```

### 2) Regression Snapshot

```ts
function compareReports(prev: any, curr: any) {
  const diff = { added: [], removed: [], changed: [] as any[] };
  const key = (p:any) => `${p.name}:${p.detail?.path}:${p.detail?.got}`;
  const a = new Map(prev.fnProbes.map((p:any)=>[key(p), p]));
  const b = new Map(curr.fnProbes.map((p:any)=>[key(p), p]));
  for (const k of b.keys()) if (!a.has(k)) diff.added.push(b.get(k));
  for (const k of a.keys()) if (!b.has(k)) diff.removed.push(a.get(k));
  for (const p of curr.fnProbes) {
    const k = key(p); const q = a.get(k);
    if (q && JSON.stringify(q.detail) !== JSON.stringify(p.detail)) diff.changed.push({prev:q, curr:p});
  }
  return diff;
}
```

### 3) CI Smoke Check

```yaml
name: QA Phase3 Smoke
on:
  workflow_dispatch:
  schedule: [ { cron: '0 3 * * *' } ]
jobs:
  phase3:
    runs-on: ubuntu-latest
    steps:
      - name: Curl test page (auth)
        run: |
          curl -sS "${BASE_URL}/admin/test-mode/phase3" -H "Cookie: ${AUTH_COOKIE}" -o /dev/null -w "%{http_code}\n"
      - name: Probe functions (example)
        run: |
          curl -sS -X POST "${BASE_URL}/functions/v1/list-checks" -H "Authorization: Bearer ${JWT}" -H "Content-Type: application/json" -d '{}' -i
    env:
      BASE_URL: ${{ secrets.QA_BASE_URL }}
      AUTH_COOKIE: ${{ secrets.QA_AUTH_COOKIE }}
      JWT: ${{ secrets.QA_USER_JWT }}
```

### 4) Negative Tests

```ts
{
  label: 'create-rule (member should fail)',
  path: '/functions/v1/create-rule',
  method: 'POST',
  expect: [403],
  minRole: 'manager',
  notes: 'Absicherungs-Test für RBAC'
}
```

### 5) RLS Macro

```sql
create or replace function public.enforce_tenant_rls(tbl regclass, tenant_col text)
returns void language plpgsql as $$
begin
  execute format('alter table %s enable row level security', tbl);
  execute format($q$
    create policy if not exists %1$s_s on %1$s for select using ((%2$s)::text = public.jwt_tenant_id());
    create policy if not exists %1$s_i on %1$s for insert with check ((%2$s)::text = public.jwt_tenant_id());
    create policy if not exists %1$s_u on %1$s for update using ((%2$s)::text = public.jwt_tenant_id()) with check ((%2$s)::text = public.jwt_tenant_id());
  $q$, tbl::text, tenant_col);
end;
$$;

-- Usage:
select public.enforce_tenant_rls('public.check_rules'::regclass, 'tenant_id');
select public.enforce_tenant_rls('public.evidences'::regclass, 'tenant_id');
```

## Fix Snippets

### Edge Function Status Convention

```ts
if (!user) return new Response('Unauthorized', { status: 401 });
if (!hasRoleAtLeast(roles, 'manager')) return new Response('Forbidden', { status: 403 });
return json200(data);
```

### Client Fetch Wrapper

- `401` → `location.replace('/auth')`
- `403` → `location.replace('/403')`

### RLS Best Practices

- Always `USING` + `WITH CHECK` symmetric
- No `SECURITY DEFINER` RPCs for end-user reads
- Service key only for admin/backoffice flows

## Phase 4 Preview: Write-Safety & Queue-Flows

- **Cross-Tenant Write Tests**: Inserts/Updates/Deletes → 403 for wrong tenant
- **Event/Queue Smoke**: Webhooks/Cron → 200/202 only
- **Billing/Webhooks**: Signature validation
- **Audit-Log Assertions**: Write operations create audit events
- **CSP/Headers Guard**: Security header validation
