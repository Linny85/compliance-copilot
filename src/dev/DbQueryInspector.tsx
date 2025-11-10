import React, { useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Nur whitelisted Views / Tabellen (read-only)
const WHITELIST = [
  'v_compliance_overview',
  'summary_overview',
  'summary_controls',
  'summary_evidence',
  'summary_training',
] as const;

type WhitelistKey = (typeof WHITELIST)[number];

export default function DbQueryInspector() {
  if (!import.meta.env.DEV) return null;

  const [source, setSource] = useState<WhitelistKey>('v_compliance_overview');
  const [tenantId, setTenantId] = useState<string>('');
  const [limit, setLimit] = useState<number>(10);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !ANON) return null;
    return createClient(SUPABASE_URL, ANON);
  }, []);

  async function run() {
    if (!supabase) {
      setResult({ error: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY' });
      return;
    }
    try {
      setLoading(true);
      let q = supabase.from(source as any).select('*').limit(limit);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { data, error } = await q;
      setResult(error ? { error: error.message } : data);
    } catch (e: any) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="db" className="space-y-3">
      <h3 className="text-xl font-semibold text-foreground">DB Query Inspector (read-only)</h3>
      <label className="block">
        <span className="text-sm font-medium text-foreground">Source</span>
        <select 
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
          value={source} 
          onChange={(e) => setSource(e.target.value as WhitelistKey)}
        >
          {WHITELIST.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-foreground">tenant_id (optional)</span>
        <input 
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground font-mono text-sm"
          value={tenantId} 
          onChange={(e) => setTenantId(e.target.value)} 
          placeholder="UUID" 
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-foreground">limit</span>
        <input 
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
          type="number" 
          min={1} 
          max={100} 
          value={limit} 
          onChange={(e) => setLimit(Number(e.target.value || 10))} 
        />
      </label>

      <button 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        onClick={run} 
        disabled={loading}
      >
        {loading ? 'Loading…' : 'Run select'}
      </button>
      
      <pre className="whitespace-pre-wrap bg-muted text-muted-foreground p-3 rounded-lg text-xs overflow-auto max-h-96">
        {result ? JSON.stringify(result, null, 2) : 'Result will appear here.'}
      </pre>
      
      <p className="text-sm text-muted-foreground">
        Nur Lesezugriff auf whitelisted Views. Keine mutierenden Queries.
      </p>
    </section>
  );
}
