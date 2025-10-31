import * as React from 'react';
import { head, exportJson, Probe } from '@/testmode/http';
import { ROUTE_CASES } from '@/testmode/redirects.cases';

type Result = { section: string; probes: Probe[] };

export default function TestRedirects() {
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<Result|null>(null);

  async function run() {
    setRunning(true);
    const probes: Probe[] = [];
    for (const c of ROUTE_CASES) {
      try {
        const r = await head(c.path);
        const location = r.headers.get('location') ?? '';
        let status: 'ok'|'warn'|'fail' = 'ok';

        // Erwartungen auswerten
        switch (c.expect) {
          case '200':
            status = (r.status === 200) ? 'ok' : 'fail';
            break;
          case '403':
            status = (r.status === 403) ? 'ok' : 'fail';
            break;
          case '302->/auth':
            status = (r.status >= 300 && r.status < 400 && location.includes('/auth')) ? 'ok' : 'fail';
            break;
          case '302->/target':
            status = (r.status >= 300 && r.status < 400 && c.target && location.includes(c.target)) ? 'ok' : 'fail';
            break;
        }

        // Sonderfall: Warnen bei „verdächtigen" 3xx ohne Ziel
        if (status === 'ok' && r.status >= 300 && r.status < 400 && !location) {
          status = 'warn';
        }

        probes.push({
          name: `route:${c.label} ${c.path}`,
          status,
          detail: { expected: c.expect, status: r.status, location }
        });
      } catch (e:any) {
        probes.push({ name: `route:${c.label} ${c.path}`, status: 'fail', detail: String(e) });
      }
    }

    setResults({ section: 'Redirects & Guards', probes });
    setRunning(false);
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Testmodus – Phase 1: Redirects & Guards</h1>
        <p className="text-muted-foreground">Nur Analyse. Keine Auto-Fixes.</p>
        <span className="text-xs opacity-70 block mt-2">
          Profil: {import.meta.env.VITE_QA_PROFILE ?? 'auth'}
        </span>
      </header>

      <div className="flex items-center gap-3 justify-center">
        <button
          disabled={running}
          onClick={run}
          className="rounded-2xl px-5 py-2 shadow bg-black text-white disabled:opacity-40"
        >
          {running ? 'Läuft…' : 'Tests starten'}
        </button>

        <button
          disabled={!results}
          onClick={()=> results && exportJson(`redirects-${Date.now()}.json`, results)}
          className="rounded-2xl px-4 py-2 border"
        >
          Export JSON
        </button>
      </div>

      {results && (
        <section className="border rounded-2xl p-4">
          <h2 className="font-semibold mb-3">{results.section}</h2>
          <ul className="space-y-2">
            {results.probes.map(p => {
              const pathMatch = p.name.match(/route:.+?\s+(\/[\w\/\-]+)/);
              const path = pathMatch?.[1] || '';
              return (
                <li key={p.name} className="flex items-start gap-3">
                  <span className={{
                    ok: 'text-green-600', warn:'text-amber-600', fail:'text-red-600'
                  }[p.status]}>
                    {p.status==='ok'?'✅':p.status==='warn'?'⚠️':'❌'}
                  </span>
                  <div className="flex-1">
                    <div className="font-mono text-sm flex items-center gap-2">
                      {p.name}
                      {path && (
                        <a 
                          href={path} 
                          className="ml-2 text-xs underline text-blue-600 hover:text-blue-800" 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          öffnen
                        </a>
                      )}
                    </div>
                    {p.detail && (
                      <pre className="bg-neutral-50 border rounded p-2 max-h-56 overflow-auto text-xs mt-2">
                        {typeof p.detail === 'string' ? p.detail : JSON.stringify(p.detail, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
