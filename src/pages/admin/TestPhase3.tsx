import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FN_CASES, RLS_TABLES, ROLE_ORDER, JWT_ROLE_CLAIM_PATH, JWT_TENANT_CLAIM } from '@/testmode/phase3.cases';
import { parseJwt, probeHttp, roleAtLeast } from '@/testmode/phase3.utils';

type FnProbe = {
  name: string;
  case: string;
  status: 'ok' | 'warn' | 'fail';
  detail: { 
    path: string; 
    method: string; 
    got: number; 
    expect: number[]; 
    location?: string; 
    minRole?: string; 
    note?: string 
  };
};

type RlsProbe = {
  table: string;
  status: 'ok' | 'warn' | 'fail';
  detail: { 
    tenant_id?: string; 
    rowsTotal: number; 
    rowsForeign: number; 
    sampleLimit: number 
  };
};

type Report = {
  section: 'Phase 3 – Edge Functions / RBAC / RLS';
  profile: {
    userId?: string | null;
    tenant_id?: string | null;
    roles?: string[];
    rawClaims?: any;
  };
  fnProbes: FnProbe[];
  rlsProbes: RlsProbe[];
};

export default function TestPhase3() {
  const [running, setRunning] = React.useState(false);
  const [report, setReport] = React.useState<Report | null>(null);
  const [profile, setProfile] = React.useState<Report['profile']>({});

  React.useEffect(() => {
    (async () => {
      const sess = (await supabase.auth.getSession()).data.session;
      const token = sess?.access_token ?? null;
      const claims = parseJwt(token);
      
      // Rollen (Array) z.B. app_metadata.roles
      const roles = extractClaimArray(claims, JWT_ROLE_CLAIM_PATH) || ['viewer'];
      const tenant_id = claims?.[JWT_TENANT_CLAIM] ?? null;

      setProfile({
        userId: sess?.user?.id ?? null,
        tenant_id,
        roles,
        rawClaims: claims
      });
    })();
  }, []);

  async function run() {
    setRunning(true);
    const sess = (await supabase.auth.getSession()).data.session;
    const token = sess?.access_token ?? null;
    const claims = parseJwt(token);
    const roles = extractClaimArray(claims, JWT_ROLE_CLAIM_PATH) || ['viewer'];
    const tenant_id = claims?.[JWT_TENANT_CLAIM] ?? null;
    const primaryRole = roles[0] || 'viewer';

    // --- Edge Function Probes ---
    const fnProbes: FnProbe[] = [];
    
    for (const c of FN_CASES) {
      const res = await probeHttp(c.path, c.method ?? 'POST', c.body);
      
      // Bewertung:
      // 1) Ist der HTTP-Status überhaupt zulässig?
      const allowed = c.expect.includes(res.status as any);
      
      // 2) Wenn minRole gesetzt ist und wir eingeloggt sind, prüfen wir grob:
      //    Wenn Rolle < minRole und res.status === 200 => fail (unzulässiger Zugriff)
      //    Wenn Rolle >= minRole und res.status in 401/403 => warn/fail
      let status: 'ok' | 'warn' | 'fail' = allowed ? 'ok' : 'fail';

      if (sess) {
        if (c.minRole) {
          const allowedByRole = roleAtLeast(primaryRole, c.minRole, ROLE_ORDER as any);
          if (!allowedByRole && res.status === 200) {
            status = 'fail';
          }
          if (allowedByRole && (res.status === 401 || res.status === 403)) {
            status = 'warn'; // RBAC/Policy stimmt evtl. nicht
          }
        }
      } else {
        // unauth Profil: 200 bei geschützten FNs wäre verdächtig
        if ((c.minRole && res.status === 200)) status = 'fail';
      }

      fnProbes.push({
        name: `fn:${c.label}`,
        case: c.label,
        status,
        detail: { 
          path: c.path, 
          method: c.method ?? 'POST', 
          got: res.status, 
          expect: c.expect as number[], 
          location: res.location, 
          minRole: c.minRole, 
          note: c.notes 
        }
      });
    }

    // --- RLS Spot-Checks ---
    const rlsProbes: RlsProbe[] = [];
    
    for (const t of RLS_TABLES) {
      let rows: Array<any> = [];
      
      try {
        const cols = t.selectCols?.length ? t.selectCols.join(',') : '*';
        const lim = t.sampleLimit ?? 50;
        
        // Use dynamic table name with type assertion
        const { data, error } = await (supabase as any)
          .from(t.table)
          .select(cols)
          .limit(lim);

        if (error) throw error;
        rows = data ?? [];
      } catch (_e) {
        rows = [];
      }
      
      const rowsTotal = rows.length;
      const rowsForeign = rows.filter(
        (r: any) => tenant_id && r?.[t.tenantColumn] && r[t.tenantColumn] !== tenant_id
      ).length;

      let status: 'ok' | 'warn' | 'fail' = 'ok';
      if (tenant_id && rowsForeign > 0) status = 'fail';            // echte Leakage
      if (!tenant_id && rowsTotal > 0)  status = 'warn';            // unauth hat Daten → fragwürdig
      if (rowsTotal === 0)              status = 'ok';              // leer ist ok (kein Leak)

      rlsProbes.push({
        table: t.table,
        status,
        detail: { 
          tenant_id: tenant_id ?? undefined, 
          rowsTotal, 
          rowsForeign, 
          sampleLimit: t.sampleLimit ?? 50 
        }
      });
    }

    const out: Report = {
      section: 'Phase 3 – Edge Functions / RBAC / RLS',
      profile: { 
        userId: sess?.user?.id ?? null, 
        tenant_id: tenant_id ?? null, 
        roles, 
        rawClaims: claims 
      },
      fnProbes,
      rlsProbes
    };
    
    setReport(out);
    setRunning(false);
  }

  function exportJson() {
    if (!report) return;
    const filename = `phase3-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyJson() {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  }

  const stats = report ? {
    totalFnProbes: report.fnProbes.length,
    fnOk: report.fnProbes.filter(p => p.status === 'ok').length,
    fnWarn: report.fnProbes.filter(p => p.status === 'warn').length,
    fnFail: report.fnProbes.filter(p => p.status === 'fail').length,
    totalRlsProbes: report.rlsProbes.length,
    rlsOk: report.rlsProbes.filter(p => p.status === 'ok').length,
    rlsWarn: report.rlsProbes.filter(p => p.status === 'warn').length,
    rlsFail: report.rlsProbes.filter(p => p.status === 'fail').length,
  } : null;

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-4">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Testmodus – Phase 3: Edge Functions · RBAC · RLS</h1>
        <p className="text-muted-foreground">Nur Analyse. Keine Auto-Fixes.</p>
        <span className="text-xs opacity-70 block mt-2">
          Edge Functions: {FN_CASES.length} | RLS Tables: {RLS_TABLES.length}
        </span>
      </header>

      <section className="border rounded-2xl p-4 bg-neutral-50">
        <h3 className="font-semibold mb-2">Aktuelles Profil</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="font-medium">User:</span>{' '}
            <code className="bg-white px-2 py-0.5 rounded">{profile.userId ?? '—'}</code>
          </div>
          <div>
            <span className="font-medium">tenant_id:</span>{' '}
            <code className="bg-white px-2 py-0.5 rounded">{profile.tenant_id ?? '—'}</code>
          </div>
          <div>
            <span className="font-medium">roles:</span>{' '}
            <code className="bg-white px-2 py-0.5 rounded">
              {(profile.roles ?? []).join(', ') || '—'}
            </code>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 justify-center flex-wrap">
        <button
          onClick={run}
          disabled={running}
          className="rounded-2xl px-5 py-2 shadow bg-black text-white disabled:opacity-40"
        >
          {running ? 'Läuft…' : 'Tests starten'}
        </button>
        <button
          onClick={exportJson}
          disabled={!report}
          className="rounded-2xl px-4 py-2 border disabled:opacity-40"
        >
          Export JSON
        </button>
        <button
          onClick={copyJson}
          disabled={!report}
          className="rounded-2xl px-4 py-2 border disabled:opacity-40"
        >
          Copy JSON
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded text-center">
            <div className="font-semibold text-green-700">{stats.fnOk}</div>
            <div className="text-xs text-green-600">Functions OK</div>
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded text-center">
            <div className="font-semibold text-amber-700">{stats.fnWarn}</div>
            <div className="text-xs text-amber-600">Functions Warn</div>
          </div>
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded text-center">
            <div className="font-semibold text-red-700">{stats.fnFail}</div>
            <div className="text-xs text-red-600">Functions Fail</div>
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded text-center">
            <div className="font-semibold text-blue-700">{stats.totalFnProbes}</div>
            <div className="text-xs text-blue-600">Functions Total</div>
          </div>
          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded text-center">
            <div className="font-semibold text-green-700">{stats.rlsOk}</div>
            <div className="text-xs text-green-600">RLS OK</div>
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded text-center">
            <div className="font-semibold text-amber-700">{stats.rlsWarn}</div>
            <div className="text-xs text-amber-600">RLS Warn</div>
          </div>
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded text-center">
            <div className="font-semibold text-red-700">{stats.rlsFail}</div>
            <div className="text-xs text-red-600">RLS Fail</div>
          </div>
          <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded text-center">
            <div className="font-semibold text-purple-700">{stats.totalRlsProbes}</div>
            <div className="text-xs text-purple-600">RLS Total</div>
          </div>
        </div>
      )}

      {/* Edge Functions */}
      {report && (
        <section className="border rounded-2xl p-4">
          <h2 className="font-semibold mb-3">Edge Functions</h2>
          {report.fnProbes.length === 0 ? (
            <div className="text-sm opacity-70 text-center py-4">
              Keine Edge Functions konfiguriert
            </div>
          ) : (
            <ul className="space-y-2">
              {report.fnProbes.map((p, i) => (
                <li key={i} className="border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">
                      {p.status === 'ok' ? '✅' : p.status === 'warn' ? '⚠️' : '❌'}
                    </span>
                    <code className="font-mono font-semibold">{p.name}</code>
                    <span className="text-xs opacity-70">
                      {p.detail.method} {p.detail.path}
                    </span>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      Details anzeigen
                    </summary>
                    <pre className="bg-neutral-50 border rounded p-2 mt-2 text-xs overflow-auto">
                      {JSON.stringify(p.detail, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* RLS */}
      {report && (
        <section className="border rounded-2xl p-4">
          <h2 className="font-semibold mb-3">RLS Spot-Checks</h2>
          {report.rlsProbes.length === 0 ? (
            <div className="text-sm opacity-70 text-center py-4">
              Keine RLS Tables konfiguriert
            </div>
          ) : (
            <ul className="space-y-2">
              {report.rlsProbes.map((p, i) => (
                <li key={i} className="border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">
                      {p.status === 'ok' ? '✅' : p.status === 'warn' ? '⚠️' : '❌'}
                    </span>
                    <code className="font-mono font-semibold">{p.table}</code>
                    {p.detail.rowsForeign > 0 && (
                      <span className="text-xs text-red-600 font-semibold">
                        ⚠️ {p.detail.rowsForeign} Fremd-Tenant-Zeilen!
                      </span>
                    )}
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      Details anzeigen
                    </summary>
                    <pre className="bg-neutral-50 border rounded p-2 mt-2 text-xs overflow-auto">
                      {JSON.stringify(p.detail, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="border-t pt-4 text-sm text-muted-foreground text-center space-y-1">
        <p>
          💡 <strong>Legende:</strong> ✅ OK | ⚠️ Warnung (prüfen) | ❌ Fehler (kritisch)
        </p>
        <p>
          Edge Functions: Erwartete Status-Codes vs. tatsächliche Response
        </p>
        <p>
          RLS: Zeilen mit fremdem tenant_id = Security-Leak!
        </p>
      </div>
    </div>
  );
}

// --- Hilfsfunktion für verschachtelte Claims (z.B. "app_metadata.roles")
function extractClaimArray(claims: any, path: string): string[] | null {
  if (!claims) return null;
  const parts = path.split('.');
  let cur: any = claims;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = cur[p];
    } else {
      return null;
    }
  }
  if (Array.isArray(cur)) return cur as string[];
  return null;
}
