import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

type Flag = { key: string; enabled: boolean };

export default function FeatureFlagTester() {
  if (!import.meta.env.DEV) return null;

  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !ANON) return null;
    return createClient(SUPABASE_URL, ANON);
  }, []);

  const [serverFlags, setServerFlags] = useState<Flag[] | null>(null);
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      try {
        setStatus('loading');
        // optional: falls Tabelle nicht existiert, fängt der Fehler ab
        const { data, error } = await supabase.from('feature_flags' as any).select('key, enabled').limit(100);
        if (cancelled) return;
        if (error) {
          setStatus('no-table');
          setServerFlags(null);
        } else {
          setStatus('ok');
          setServerFlags((data || []) as Flag[]);
        }
      } catch {
        if (!cancelled) {
          setStatus('no-table');
          setServerFlags(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  function toggleLocal(key: string, current: boolean) {
    setLocalFlags(prev => ({ ...prev, [key]: !current }));
  }

  const effective = (key: string, defaultEnabled = false) => {
    // Lokale Simulation hat Vorrang (nur DEV), sonst Serverwert, sonst Default
    if (key in localFlags) return localFlags[key];
    const server = serverFlags?.find(f => f.key === key)?.enabled;
    return server ?? defaultEnabled;
  };

  const sampleKeys = ['dashboard.newProgressCard', 'norrly.experimental', 'org.mpw.hardening'];

  return (
    <section id="flags" className="space-y-4">
      <h3 className="text-xl font-semibold text-foreground">Feature Flag Tester (DEV-only, local simulation)</h3>

      <div className="text-sm text-muted-foreground">
        Server Flags: {status === 'ok' ? `geladen (${serverFlags?.length ?? 0})` : status === 'loading' ? 'laden…' : 'nicht verfügbar (optional)'}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 text-foreground">Key</th>
              <th className="text-left p-2 text-foreground">Server</th>
              <th className="text-left p-2 text-foreground">Local (override)</th>
              <th className="text-left p-2 text-foreground">Effective</th>
            </tr>
          </thead>
          <tbody>
            {sampleKeys.map((k) => {
              const serverVal = serverFlags?.find(f => f.key === k)?.enabled ?? null;
              const localVal = localFlags[k] ?? null;
              const eff = effective(k, false);
              return (
                <tr key={k} className="border-b border-border/50">
                  <td className="p-2 font-mono text-sm text-foreground">{k}</td>
                  <td className="p-2 text-muted-foreground">
                    {serverVal === null ? 'n/a' : (serverVal ? 'true' : 'false')}
                  </td>
                  <td className="p-2">
                    <button 
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                      onClick={() => toggleLocal(k, !!localVal)}
                    >
                      {localVal === null ? '—' : (localVal ? 'true' : 'false')}
                    </button>
                    <span className="ml-2 text-xs text-muted-foreground">(toggle setzt/entfernt Override)</span>
                  </td>
                  <td className="p-2 text-foreground font-medium">{eff ? 'true' : 'false'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        Hinweis: Lokale Overrides wirken nur im DEV-Modus und ändern keine Serverwerte.
      </p>
    </section>
  );
}
