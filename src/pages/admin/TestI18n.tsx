import * as React from 'react';
import { I18N } from '@/testmode/i18n.cases';
import { fetchI18n, flatKeys, extractVars, compareVarSets } from '@/testmode/i18n.utils';

type VarMismatch = {
  key: string;
  baseVars: string[];
  transVars: string[];
  missing: string[];
  extra: string[];
};

type Finding = {
  lang: string;
  ns: string;
  missingKeys: string[];
  varMismatches: VarMismatch[];
};

type Report = {
  section: 'i18n Konsistenz';
  findings: Finding[];
};

export default function TestI18n() {
  const [running, setRunning] = React.useState(false);
  const [report, setReport] = React.useState<Report | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'missing' | 'vars'>('all');

  async function run() {
    setRunning(true);
    const out: Finding[] = [];

    for (const ns of I18N.namespaces) {
      try {
        const baseObj = await fetchI18n(I18N.baseLang, ns, I18N.baseUrl);
        const baseFlat = flatKeys(baseObj);

        for (const lang of I18N.langs.filter(l => l !== I18N.baseLang)) {
          try {
            const obj = await fetchI18n(lang, ns, I18N.baseUrl);
            const flat = flatKeys(obj);

            // Find missing keys
            const missingKeys = Object.keys(baseFlat).filter(k => !(k in flat));

            // Find variable mismatches
            const varMismatches: VarMismatch[] = [];
            for (const k of Object.keys(baseFlat)) {
              if (!(k in flat)) continue;
              
              const bVars = extractVars(baseFlat[k]);
              const tVars = extractVars(flat[k]);
              const cmp = compareVarSets(bVars, tVars);
              
              if (cmp.missing.length || cmp.extra.length) {
                varMismatches.push({
                  key: k,
                  baseVars: bVars,
                  transVars: tVars,
                  missing: cmp.missing,
                  extra: cmp.extra
                });
              }
            }

            out.push({ lang, ns, missingKeys, varMismatches });
          } catch (e: any) {
            out.push({
              lang,
              ns,
              missingKeys: [`__LOAD_ERROR__: ${String(e)}`],
              varMismatches: []
            });
          }
        }
      } catch (e: any) {
        // Base language file missing - skip namespace
        console.error(`Skipping namespace ${ns}: ${e}`);
      }
    }

    setReport({ section: 'i18n Konsistenz', findings: out });
    setRunning(false);
  }

  function exportJson() {
    if (!report) return;
    
    const filename = `i18n-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  }

  const rows = report?.findings.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'missing') return f.missingKeys.length > 0;
    if (filter === 'vars') return f.varMismatches.length > 0;
    return true;
  }) ?? [];

  const stats = report ? {
    totalMissingKeys: report.findings.reduce((sum, f) => sum + f.missingKeys.length, 0),
    totalVarMismatches: report.findings.reduce((sum, f) => sum + f.varMismatches.length, 0),
    filesWithIssues: report.findings.filter(f => f.missingKeys.length > 0 || f.varMismatches.length > 0).length
  } : null;

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-4">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Testmodus – Phase 2: i18n Konsistenz</h1>
        <p className="text-muted-foreground">
          Fehlende Keys & Variablen-Mismatches (read-only)
        </p>
        <span className="text-xs opacity-70 block mt-2">
          Base: {I18N.baseLang} | Langs: {I18N.langs.join(', ')} | Namespaces: {I18N.namespaces.length}
        </span>
      </header>

      <div className="flex items-center gap-3 justify-center flex-wrap">
        <button
          onClick={run}
          disabled={running}
          className="rounded-2xl px-5 py-2 shadow bg-black text-white disabled:opacity-40"
        >
          {running ? 'Läuft…' : 'Tests starten'}
        </button>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
          className="border rounded px-3 py-2"
          disabled={!report}
        >
          <option value="all">Alle anzeigen</option>
          <option value="missing">Nur fehlende Keys</option>
          <option value="vars">Nur Variablen-Mismatches</option>
        </select>

        <button
          onClick={exportJson}
          disabled={!report}
          className="rounded-2xl px-4 py-2 border disabled:opacity-40"
        >
          Export JSON
        </button>

        <button
          onClick={copyToClipboard}
          disabled={!report}
          className="rounded-2xl px-4 py-2 border disabled:opacity-40"
        >
          Copy JSON
        </button>
      </div>

      {stats && (
        <div className="flex gap-4 justify-center text-sm">
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded">
            <span className="font-semibold">{stats.totalMissingKeys}</span> fehlende Keys
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded">
            <span className="font-semibold">{stats.totalVarMismatches}</span> Variablen-Mismatches
          </div>
          <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded">
            <span className="font-semibold">{stats.filesWithIssues}</span> Dateien betroffen
          </div>
        </div>
      )}

      {report && (
        <section className="border rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="text-left p-2 border">Lang</th>
                <th className="text-left p-2 border">Namespace</th>
                <th className="text-left p-2 border">Fehlende Keys</th>
                <th className="text-left p-2 border">Variablen-Mismatches</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    {filter === 'all' 
                      ? '✅ Keine Probleme gefunden!'
                      : 'Keine Ergebnisse für diesen Filter'}
                  </td>
                </tr>
              ) : (
                rows.map((f, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 border font-mono">{f.lang}</td>
                    <td className="p-2 border font-mono">{f.ns}</td>
                    <td className="p-2 border">
                      {f.missingKeys.length ? (
                        <details>
                          <summary className="cursor-pointer text-amber-600 font-semibold">
                            {f.missingKeys.length} fehlend
                          </summary>
                          <pre className="bg-neutral-50 border rounded p-2 mt-2 max-h-40 overflow-auto text-xs">
                            {f.missingKeys.join('\n')}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-green-600">✓</span>
                      )}
                    </td>
                    <td className="p-2 border">
                      {f.varMismatches.length ? (
                        <details>
                          <summary className="cursor-pointer text-blue-600 font-semibold">
                            {f.varMismatches.length} Mismatches
                          </summary>
                          <pre className="bg-neutral-50 border rounded p-2 mt-2 max-h-40 overflow-auto text-xs">
                            {f.varMismatches.map(v => 
                              `${v.key}\n` +
                              `  base: [${v.baseVars.join(', ')}]\n` +
                              `  trans: [${v.transVars.join(', ')}]\n` +
                              (v.missing.length ? `  ⚠️ fehlen: ${v.missing.join(', ')}\n` : '') +
                              (v.extra.length ? `  ⚠️ extra: ${v.extra.join(', ')}\n` : '')
                            ).join('\n')}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-green-600">✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
