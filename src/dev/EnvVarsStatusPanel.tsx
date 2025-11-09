export function EnvVarsStatusPanel() {
  if (!import.meta.env.DEV) return null;

  const vars = [
    { key: 'VITE_SUPABASE_URL', present: !!import.meta.env.VITE_SUPABASE_URL },
    { key: 'VITE_SUPABASE_ANON_KEY', present: !!import.meta.env.VITE_SUPABASE_ANON_KEY },
    { key: 'ALLOWED_ORIGINS (Edge)', present: undefined },
    { key: 'PREVIEW_PG_CONNECTION (CI)', present: undefined },
    { key: 'PREVIEW_TENANT_USER_UUID (CI)', present: undefined },
  ];

  return (
    <div className="p-4 border border-border rounded-lg text-sm bg-background">
      <div className="font-semibold mb-3 text-foreground">Env Vars Status (DEV)</div>
      <ul className="space-y-2">
        {vars.map((v) => (
          <li key={v.key} className="flex justify-between items-center">
            <span className="font-mono text-muted-foreground">{v.key}</span>
            <span className={v.present === undefined ? 'text-muted-foreground' : v.present ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
              {v.present === undefined ? 'n/a (server/CI)' : v.present ? 'present ✓' : 'absent ✗'}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 p-3 bg-muted rounded text-xs text-muted-foreground">
        <strong>Hinweise:</strong> Edge/CI-Variablen werden hier nicht ausgelesen. Siehe Doku{' '}
        <a href="/docs/master-password.md#cors-configuration" className="underline">
          „CORS Configuration"
        </a>{' '}
        und „Nightly Seeding".
      </div>
    </div>
  );
}
