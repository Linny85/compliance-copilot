import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';

// ====== Konfiguration ======
type WriteCase = {
  label: string;
  table: string;
  tenantColumn: string;
  mode: 'insert'|'update'|'delete';
  sampleSelectCols?: string[];
  notes?: string;
};

type WebhookCase = {
  label: string;
  path: string;
  method?: 'POST'|'GET';
  headers?: Record<string,string>;
  body?: any;
  expect: number[];
  notes?: string;
};

type HeaderExpect = {
  name: string;
  mustInclude?: string[];
  mustNotInclude?: string[];
  notes?: string;
};

export const WRITE_CASES: WriteCase[] = [
  {
    label: 'evidences INSERT (fremder tenant → 403 erwartet)',
    table: 'evidences',
    tenantColumn: 'tenant_id',
    mode: 'insert',
    notes: 'Schreibschutz via RLS'
  },
  {
    label: 'check_rules UPDATE (fremder tenant → 403 erwartet)',
    table: 'check_rules',
    tenantColumn: 'tenant_id',
    mode: 'update',
  },
  {
    label: 'audit_tasks DELETE (fremder tenant → 403 erwartet)',
    table: 'audit_tasks',
    tenantColumn: 'tenant_id',
    mode: 'delete',
  },
];

export const WEBHOOK_CASES: WebhookCase[] = [
  {
    label: 'Postmark Webhook (invalid signature → 401/403/400)',
    path: '/webhooks/postmark',
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-postmark-signature': 'INVALID' },
    body: { test: true },
    expect: [400,401,403],
    notes: 'Server MUSS invalid signaturen ablehnen'
  },
  {
    label: 'Stripe Webhook (invalid signature → 401/403/400)',
    path: '/webhooks/stripe',
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 't=0,v1=deadbeef' },
    body: { type: 'ping' },
    expect: [400,401,403],
  },
];

export const HEADER_EXPECT: HeaderExpect[] = [
  {
    name: 'content-security-policy',
    mustInclude: ['default-src', 'script-src', 'frame-ancestors'],
    notes: 'Harte CSP aktiv'
  },
  {
    name: 'permissions-policy',
    mustNotInclude: ['*'],
    notes: 'Keine Wildcards'
  },
  {
    name: 'cross-origin-opener-policy',
    mustInclude: ['same-origin'],
  },
  {
    name: 'cross-origin-embedder-policy',
    mustInclude: ['require-corp'],
  }
];

// ====== Hilfen ======
type Row = Record<string,any>;
type Status = 'ok'|'warn'|'fail';

function classifyRlsError(err?: any): 'perm'|'other'|'none' {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  if (!msg) return 'none';
  if (
    msg.includes('permission denied') ||
    msg.includes('violates row-level security') ||
    msg.includes('new row violates row-level security policy') ||
    msg.includes('rls')
  ) return 'perm';
  return 'other';
}

async function badTenantId(): Promise<string> {
  const sess = (await supabase.auth.getSession()).data.session;
  const myTenant = (sess?.user?.user_metadata?.tenant_id) || (sess as any)?.tenant_id || null;

  if (!myTenant) {
    const rnd = crypto.getRandomValues(new Uint8Array(16));
    rnd[6] = (rnd[6] & 0x0f) | 0x40;
    rnd[8] = (rnd[8] & 0x3f) | 0x80;
    const hex = [...rnd].map(b => b.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  const { data } = await supabase.from('Unternehmen').select('id').limit(10);
  const other = (data || []).map(r => r.id).find((id: string)=> id && id !== myTenant);
  return other || (await badTenantId());
}

async function probeWrite(c: WriteCase): Promise<{status:Status, detail:any}> {
  const foreignTenant = await badTenantId();

  try {
    if (c.mode === 'insert') {
      const payload: Row = { [c.tenantColumn]: foreignTenant, __qa_ts: new Date().toISOString() };
      const { error } = await (supabase as any).from(c.table).insert(payload).select().single();
      const typ = classifyRlsError(error);
      if (typ === 'perm') return { status: 'ok', detail: { mode:c.mode, error: error?.message } };
      if (!error) return { status: 'fail', detail: { mode:c.mode, got: 'INSERT succeeded – erwartet: RLS block' } };
      return { status: 'warn', detail: { mode:c.mode, error: error?.message } };
    }

    if (c.mode === 'update') {
      const { data: rows } = await (supabase as any).from(c.table).select([...(c.sampleSelectCols||['id',c.tenantColumn])].join(',')).limit(1);
      const row = rows?.[0];
      const { error } = await (supabase as any).from(c.table).update({ [c.tenantColumn]: foreignTenant }).eq('id', row?.id);
      const typ = classifyRlsError(error);
      if (typ === 'perm') return { status: 'ok', detail: { mode:c.mode, error: error?.message } };
      if (!error) return { status: 'fail', detail: { mode:c.mode, got: 'UPDATE succeeded – erwartet: RLS block' } };
      return { status: 'warn', detail: { mode:c.mode, error: error?.message } };
    }

    if (c.mode === 'delete') {
      const { data: rows } = await (supabase as any).from(c.table).select(['id',c.tenantColumn].join(',')).limit(1);
      const row = rows?.[0];
      const { error } = await (supabase as any).from(c.table).delete().eq('id', row?.id);
      const typ = classifyRlsError(error);
      if (typ === 'perm') return { status: 'ok', detail: { mode:c.mode, error: error?.message } };
      if (!error) return { status: 'fail', detail: { mode:c.mode, got: 'DELETE succeeded – erwartet: RLS block' } };
      return { status: 'warn', detail: { mode:c.mode, error: error?.message } };
    }

    return { status: 'warn', detail: { msg: 'unknown mode' } };
  } catch (e:any) {
    const typ = classifyRlsError(e);
    if (typ === 'perm') return { status: 'ok', detail: { mode:c.mode, error: String(e) } };
    return { status: 'warn', detail: { mode:c.mode, error: String(e) } };
  }
}

async function probeWebhook(c: WebhookCase): Promise<{status:Status, detail:any}> {
  try {
    const res = await fetch(c.path, {
      method: c.method || 'POST',
      headers: { 'content-type': 'application/json', ...(c.headers||{}) },
      body: c.method === 'GET' ? undefined : JSON.stringify(c.body ?? {})
    });
    const ok = c.expect.includes(res.status);
    const status: Status = ok ? 'ok' : 'fail';
    return { status, detail: { got: res.status, expect: c.expect, path: c.path, method: c.method || 'POST' } };
  } catch (e:any) {
    return { status: 'warn' as Status, detail: { error: String(e), path: c.path } };
  }
}

async function probeHeaders(url: string, expects: HeaderExpect[]): Promise<{status:Status, detail:any}> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual', cache: 'no-store' });
    const findings: Array<{name:string;status:Status;value:string}> = [];

    for (const ex of expects) {
      const val = res.headers.get(ex.name) || '';
      let st: Status = 'ok';
      if (ex.mustInclude?.some(s => !val.toLowerCase().includes(s.toLowerCase()))) st = 'fail';
      if (ex.mustNotInclude?.some(s => val.toLowerCase().includes(s.toLowerCase()))) st = 'fail';
      findings.push({ name: ex.name, status: st, value: val });
    }

    const overall: Status = findings.some(f => f.status === 'fail') ? 'fail' : 'ok';
    return { status: overall, detail: { url, headers: findings } };
  } catch (e:any) {
    return { status: 'warn' as Status, detail: { url, error: String(e) } };
  }
}

// ====== UI ======
type ProbeRow = { name: string; status: Status; detail: any };

export default function TestPhase4() {
  const [running, setRunning] = React.useState(false);
  const [writes, setWrites] = React.useState<ProbeRow[]>([]);
  const [hooks, setHooks] = React.useState<ProbeRow[]>([]);
  const [heads, setHeads] = React.useState<ProbeRow[]>([]);
  const [profile, setProfile] = React.useState<{userId?:string|null, tenant_id?:string|null, roles?:string[]}>({});

  React.useEffect(() => {
    (async () => {
      const sess = (await supabase.auth.getSession()).data.session;
      const claims = (sess as any)?.access_token ? JSON.parse(atob((sess as any).access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) : null;
      setProfile({
        userId: sess?.user?.id ?? null,
        tenant_id: claims?.tenant_id ?? null,
        roles: claims?.app_metadata?.roles ?? []
      });
    })();
  }, []);

  async function runAll() {
    setRunning(true);
    const w: ProbeRow[] = [];
    for (const c of WRITE_CASES) {
      const r = await probeWrite(c);
      w.push({ name: `write:${c.label}`, status: r.status, detail: { table:c.table, mode:c.mode, ...r.detail, notes: c.notes } });
    }
    setWrites(w);

    const h: ProbeRow[] = [];
    for (const c of WEBHOOK_CASES) {
      const r = await probeWebhook(c);
      h.push({ name: `webhook:${c.label}`, status: r.status, detail: { ...r.detail, notes:c.notes } });
    }
    setHooks(h);

    const hd = await probeHeaders('/', HEADER_EXPECT);
    setHeads([{ name: 'headers:/ (CSP/COOP/COEP/PP)', status: hd.status, detail: hd.detail }]);

    setRunning(false);
  }

  function exportJson() {
    const payload = {
      section: 'Phase 4 – Write-Safety, Webhooks, Security Headers',
      profile,
      writes, hooks, heads,
      generatedAt: new Date().toISOString()
    };
    const filename = `phase4-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Testmodus – Phase 4: Write-Safety · Webhooks · Security Headers</h1>
      <p className="text-sm text-muted-foreground">Nur Analyse. Keine Auto-Fixes.</p>

      <div className="mt-4 rounded-xl border p-4">
        <div className="flex gap-4 items-center">
          <button onClick={runAll} disabled={running} className="rounded-2xl px-4 py-2 bg-primary text-primary-foreground disabled:opacity-50">
            {running ? 'Läuft…' : 'Tests starten'}
          </button>
          <button onClick={exportJson} className="rounded-2xl px-4 py-2 border">Export JSON</button>
        </div>
        <div className="mt-3 text-sm">
          <b>Profil:</b> user={profile.userId || '—'} · tenant_id={profile.tenant_id || '—'} · roles={(profile.roles||[]).join(', ') || '—'}
        </div>
      </div>

      {/* Writes */}
      <div className="mt-6 rounded-xl border p-4">
        <h2 className="font-semibold">Cross-Tenant Write Tests (RLS EXPECT 403)</h2>
        {writes.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Ergebnisse.</p> :
          <div className="mt-3 space-y-3">
            {writes.map((p,i)=>(
              <details key={i} className="rounded-lg border p-3">
                <summary className="cursor-pointer flex items-center gap-2">
                  <span>{p.status==='ok'?'✅':p.status==='warn'?'⚠️':'❌'}</span>
                  <span className="font-medium">{p.name}</span>
                </summary>
                <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">{JSON.stringify(p.detail,null,2)}</pre>
              </details>
            ))}
          </div>
        }
      </div>

      {/* Webhooks */}
      <div className="mt-6 rounded-xl border p-4">
        <h2 className="font-semibold">Webhook-Signatur (INVALID MUST FAIL)</h2>
        {hooks.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Ergebnisse.</p> :
          <div className="mt-3 space-y-3">
            {hooks.map((p,i)=>(
              <details key={i} className="rounded-lg border p-3">
                <summary className="cursor-pointer flex items-center gap-2">
                  <span>{p.status==='ok'?'✅':p.status==='warn'?'⚠️':'❌'}</span>
                  <span className="font-medium">{p.name}</span>
                </summary>
                <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">{JSON.stringify(p.detail,null,2)}</pre>
              </details>
            ))}
          </div>
        }
      </div>

      {/* Headers */}
      <div className="mt-6 rounded-xl border p-4">
        <h2 className="font-semibold">Security Headers (CSP · COOP · COEP · Permissions-Policy)</h2>
        {heads.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Ergebnisse.</p> :
          <div className="mt-3 space-y-3">
            {heads.map((p,i)=>(
              <details key={i} className="rounded-lg border p-3">
                <summary className="cursor-pointer flex items-center gap-2">
                  <span>{p.status==='ok'?'✅':p.status==='warn'?'⚠️':'❌'}</span>
                  <span className="font-medium">{p.name}</span>
                </summary>
                <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">{JSON.stringify(p.detail,null,2)}</pre>
              </details>
            ))}
          </div>
        }
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        💡 Legende: ✅ OK | ⚠️ Prüfen | ❌ Kritisch<br/>
        Writes: Cross-Tenant muss geblockt werden (RLS/Policies).<br/>
        Webhooks: Ungültige Signaturen dürfen nicht akzeptiert werden (401/403/400).<br/>
        Headers: CSP/COOP/COEP/Permissions-Policy müssen korrekt gesetzt sein.
      </div>
    </div>
  );
}
