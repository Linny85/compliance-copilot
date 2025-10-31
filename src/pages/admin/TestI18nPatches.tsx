import * as React from 'react';
import { I18N } from '@/testmode/i18n.cases';
import { fetchI18n, flatKeys, extractVars, compareVarSets } from '@/testmode/i18n.utils';

type PatchMode = 'empty' | 'copy-en';

type MissingEntry = {
  ns: string;
  lang: string;
  keys: string[];
};

type VarMismatch = {
  ns: string;
  lang: string;
  key: string;
  baseVars: string[];
  transVars: string[];
};

export default function TestI18nPatches() {
  const [running, setRunning] = React.useState(false);
  const [baseMaps, setBaseMaps] = React.useState<Record<string, Record<string, string>>>({});
  const [missing, setMissing] = React.useState<MissingEntry[]>([]);
  const [varMismatches, setVarMismatches] = React.useState<VarMismatch[]>([]);
  const [mode, setMode] = React.useState<PatchMode>('empty');

  async function run() {
    setRunning(true);
    const _baseMaps: Record<string, Record<string, string>> = {};
    const _missing: MissingEntry[] = [];
    const _varM: VarMismatch[] = [];

    for (const ns of I18N.namespaces) {
      try {
        // Load EN as baseline
        const baseObj = await fetchI18n(I18N.baseLang, ns, I18N.baseUrl);
        const base = flatKeys(baseObj);
        _baseMaps[ns] = base;

        for (const lang of I18N.langs.filter(l => l !== I18N.baseLang)) {
          try {
            const transObj = await fetchI18n(lang, ns, I18N.baseUrl);
            const trans = flatKeys(transObj);

            // Find missing keys
            const miss = Object.keys(base).filter(k => !(k in trans));
            if (miss.length) {
              _missing.push({ ns, lang, keys: miss });
            }

            // Find variable mismatches
            for (const k of Object.keys(base)) {
              if (!(k in trans)) continue;
              const cmp = compareVarSets(extractVars(base[k]), extractVars(trans[k]));
              if (cmp.missing.length || cmp.extra.length) {
                _varM.push({
                  ns,
                  lang,
                  key: k,
                  baseVars: extractVars(base[k]),
                  transVars: extractVars(trans[k])
                });
              }
            }
          } catch (e) {
            _missing.push({ ns, lang, keys: [`__LOAD_ERROR__ ${String(e)}`] });
          }
        }
      } catch (e) {
        // Base language file missing - skip namespace
        console.error(`Skipping namespace ${ns}: ${e}`);
      }
    }

    setBaseMaps(_baseMaps);
    setMissing(_missing);
    setVarMismatches(_varM);
    setRunning(false);
  }

  // Convert dot-notation keys back to nested object
  function unflatten(obj: Record<string, string>) {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const parts = k.split('.');
      let cur = out;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (i === parts.length - 1) {
          cur[p] = v;
        } else {
          cur[p] = cur[p] || {};
          cur = cur[p];
        }
      }
    }
    return out;
  }

  function buildPatch(ns: string, lang: string, keys: string[]) {
    const base = baseMaps[ns] || {};
    const out: Record<string, string> = {};
    
    for (const k of keys) {
      if (k.startsWith('__LOAD_ERROR__')) continue;
      out[k] = (mode === 'copy-en') ? (base[k] ?? '') : '';
    }
    
    return JSON.stringify(unflatten(out), null, 2);
  }

  function download(ns: string, lang: string, keys: string[]) {
    const json = buildPatch(ns, lang, keys);
    const filename = `patch-${lang}-${ns}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy(ns: string, lang: string, keys: string[]) {
    const json = buildPatch(ns, lang, keys);
    navigator.clipboard.writeText(json);
  }

  function exportVarFixes(ns: string, lang: string) {
    const rows = varMismatches
      .filter(v => v.ns === ns && v.lang === lang)
      .map(v => `${v.key}\n  expected: ${v.baseVars.join(', ')}\n  found:    ${v.transVars.join(', ')}`)
      .join('\n\n');

    const blob = new Blob([rows || 'No mismatches.'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vars-${lang}-${ns}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group by namespace and language for UI
  const groupByNsLang = missing.reduce((acc, m) => {
    const key = `${m.ns}__${m.lang}`;
    if (!acc[key]) {
      acc[key] = { ns: m.ns, lang: m.lang, keys: [] as string[] };
    }
    acc[key].keys.push(...m.keys);
    return acc;
  }, {} as Record<string, { ns: string; lang: string; keys: string[] }>);

  const stats = {
    totalMissingKeys: missing.reduce((sum, m) => sum + m.keys.length, 0),
    totalVarMismatches: varMismatches.length,
    filesWithMissingKeys: Object.keys(groupByNsLang).length
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-4">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Testmodus – Phase 2: i18n Patch-Generator</h1>
        <p className="text-muted-foreground">
          Erzeugt JSON-Skeletons für fehlende Keys + Variablen-Hinweise
        </p>
        <span className="text-xs opacity-70 block mt-2">
          Base: {I18N.baseLang} | Target: {I18N.langs.filter(l => l !== I18N.baseLang).join(', ')}
        </span>
      </header>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={run}
          disabled={running}
          className="rounded-2xl px-5 py-2 shadow bg-black text-white disabled:opacity-40"
        >
          {running ? 'Läuft…' : 'Analysieren'}
        </button>

        <label className="flex items-center gap-2 text-sm border rounded px-3 py-2">
          <span>Werte füllen:</span>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as PatchMode)}
            className="outline-none bg-transparent"
          >
            <option value="empty">Leer lassen (empfohlen)</option>
            <option value="copy-en">Mit EN vorbelegen</option>
          </select>
        </label>
      </div>

      {running === false && baseMaps && Object.keys(baseMaps).length > 0 && (
        <div className="flex gap-4 justify-center text-sm">
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded">
            <span className="font-semibold">{stats.totalMissingKeys}</span> fehlende Keys
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded">
            <span className="font-semibold">{stats.totalVarMismatches}</span> Variablen-Mismatches
          </div>
          <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded">
            <span className="font-semibold">{stats.filesWithMissingKeys}</span> Dateien betroffen
          </div>
        </div>
      )}

      <section className="border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Fehlende Keys (Gruppiert nach Namespace/Sprache)</h2>
        {Object.values(groupByNsLang).length === 0 ? (
          <div className="text-sm opacity-70 text-center py-4">
            {running ? 'Klicke "Analysieren" um zu starten' : 'Keine fehlenden Keys 🎉'}
          </div>
        ) : (
          <ul className="space-y-3">
            {Object.values(groupByNsLang).map(({ ns, lang, keys }) => (
              <li key={`${ns}__${lang}`} className="border rounded-xl p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-mono text-sm">
                    <span className="font-semibold">{lang}</span>/{ns}.json
                    <span className="ml-2 text-xs opacity-70">({keys.length} keys)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copy(ns, lang, keys)}
                      className="px-3 py-1 border rounded hover:bg-neutral-50"
                    >
                      Copy JSON
                    </button>
                    <button
                      onClick={() => download(ns, lang, keys)}
                      className="px-3 py-1 border rounded hover:bg-neutral-50"
                    >
                      Download JSON
                    </button>
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    {keys.length} fehlende Keys anzeigen
                  </summary>
                  <pre className="bg-neutral-50 border rounded p-2 mt-2 max-h-48 overflow-auto text-xs">
                    {keys.join('\n')}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Variablen-Mismatches</h2>
        {varMismatches.length === 0 ? (
          <div className="text-sm opacity-70 text-center py-4">
            {running ? 'Warte auf Analyse...' : 'Keine Mismatches 🎉'}
          </div>
        ) : (
          <ul className="space-y-3">
            {I18N.namespaces.map(ns =>
              I18N.langs
                .filter(l => l !== I18N.baseLang)
                .map(lang => {
                  const count = varMismatches.filter(
                    v => v.ns === ns && v.lang === lang
                  ).length;
                  if (!count) return null;
                  
                  return (
                    <li key={`${ns}__${lang}`} className="border rounded-xl p-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="font-mono text-sm">
                          <span className="font-semibold">{lang}</span>/{ns}.json
                          <span className="ml-2 text-xs opacity-70">({count} mismatches)</span>
                        </div>
                        <button
                          onClick={() => exportVarFixes(ns, lang)}
                          className="px-3 py-1 border rounded hover:bg-neutral-50"
                        >
                          Export Hinweise
                        </button>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          {count} betroffene Keys
                        </summary>
                        <pre className="bg-neutral-50 border rounded p-2 mt-2 max-h-48 overflow-auto text-xs">
                          {varMismatches
                            .filter(v => v.ns === ns && v.lang === lang)
                            .map(
                              v =>
                                `${v.key}\n  expected: [${v.baseVars.join(', ')}]\n  found:    [${v.transVars.join(', ')}]`
                            )
                            .join('\n\n')}
                        </pre>
                      </details>
                    </li>
                  );
                })
            )}
          </ul>
        )}
      </section>

      <div className="border-t pt-4 text-sm text-muted-foreground text-center">
        <p>
          💡 Tipp: Merge die generierten JSONs mit deinen bestehenden Dateien in{' '}
          <code className="bg-neutral-100 px-1 rounded">public/locales/</code>
        </p>
        <p className="mt-1">
          Variablen-Mismatches müssen manuell korrigiert werden (Platzhalter anpassen).
        </p>
      </div>
    </div>
  );
}
