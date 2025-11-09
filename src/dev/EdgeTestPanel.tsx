import React, { useState } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

async function postVerifyMaster(origin: string, companyId: string, password: string) {
  if (!supabaseUrl || !anonKey) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  const res = await fetch(`${supabaseUrl}/functions/v1/verify-master`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ company_id: companyId, password }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body };
}

export default function EdgeTestPanel() {
  if (!import.meta.env.DEV) return null;

  const [origin, setOrigin] = useState(window.location.origin);
  const [companyId, setCompanyId] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  return (
    <section id="edge" className="space-y-4">
      <h3 className="text-xl font-semibold text-foreground">Edge Function Test (verify-master)</h3>
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-foreground">Origin</span>
          <input 
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
            value={origin} 
            onChange={(e) => setOrigin(e.target.value)} 
            placeholder="https://your-preview-domain" 
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">company_id (UUID)</span>
          <input 
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground font-mono text-sm"
            value={companyId} 
            onChange={(e) => setCompanyId(e.target.value)} 
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">password</span>
          <input 
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            type="password" 
          />
        </label>

        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          onClick={async () => {
            try {
              setLoading(true);
              const r = await postVerifyMaster(origin, companyId, password);
              setResult(r);
            } catch (err) {
              setResult({ error: String(err) });
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          {loading ? 'Testing…' : 'Test Edge POST'}
        </button>

        <pre className="whitespace-pre-wrap bg-muted text-muted-foreground p-3 rounded-lg text-xs overflow-auto max-h-96">
          {result ? JSON.stringify(result, null, 2) : 'Result will appear here.'}
        </pre>

        <p className="text-sm text-muted-foreground">
          Hinweis: Dieser Test nutzt nur <code className="bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_URL</code>/<code className="bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>. Keine Secrets werden angezeigt.
        </p>
      </div>
    </section>
  );
}
