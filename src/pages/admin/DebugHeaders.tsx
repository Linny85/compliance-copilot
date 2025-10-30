import React from "react";
import AdminPage from "@/components/layout/AdminPage";

type Hs = Record<string, string>;

async function getHeaders(path: string): Promise<Hs> {
  const res = await fetch(path, { method: "HEAD", cache: "no-store" });
  const out: Hs = {};
  for (const [k, v] of (res.headers as any).entries()) {
    if (!k) continue;
    // wir interessieren uns v.a. für CSP/PP, zeigen aber alles
    out[k.toLowerCase()] = v;
  }
  return out;
}

export default function DebugHeaders() {
  const [root, setRoot] = React.useState<Hs | null>(null);
  const [indexH, setIndexH] = React.useState<Hs | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [h1, h2] = await Promise.all([getHeaders("/"), getHeaders("/index.html")]);
        setRoot(h1);
        setIndexH(h2);
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
  }, []);

  const Item = ({ title, data }: { title: string; data: Hs | null }) => (
    <div className="rounded-2xl border p-4 my-4">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      {data ? (
        <pre className="whitespace-pre-wrap text-sm">
{JSON.stringify(
  Object.fromEntries(
    Object.entries(data).filter(([k]) =>
      ["content-security-policy","permissions-policy","referrer-policy","strict-transport-security","cross-origin-opener-policy","cross-origin-resource-policy","x-frame-options","x-content-type-options","origin-agent-cluster"].includes(k)
    )
  ),
  null, 2
)}
        </pre>
      ) : (
        <p className="text-sm opacity-70">Lade…</p>
      )}
    </div>
  );

  return (
    <AdminPage
      title="Header-Diagnose"
      subtitle="Prüft die tatsächlich ausgelieferten Sicherheits-Header dieser Deployment-Umgebung"
    >
      {err && <div className="text-red-600 mb-4">Fehler: {err}</div>}
      <Item title="HEAD /" data={root} />
      <Item title="HEAD /index.html" data={indexH} />
      <div className="text-sm opacity-70 mt-4">
        Hinweis: Wenn hier eine CSP mit <code>nonce-…</code> oder <code>'strict-dynamic'</code> erscheint,
        überschreibt der Hoster/Preview unsere <code>public/_headers</code>.
      </div>
    </AdminPage>
  );
}
