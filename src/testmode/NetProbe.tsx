import * as React from "react";

const ROUTES = [
  "/dashboard", "/nis2", "/ai-act", "/documents", "/billing",
  "/admin/ops", "/admin/training-certificates", "/admin/email",
  "/admin/helpbot", "/admin/graph", "/auth", "/"
];

async function probe(url: string) {
  const common: RequestInit = {
    cache: "no-store",
    redirect: "manual",
    credentials: "include",
  };
  let res: Response | null = null;
  try { res = await fetch(url, { ...common, method: "HEAD" }); } catch {}
  if (!res || [0,404,405].includes(res.status)) {
    res = await fetch(url, { ...common, method: "GET" });
  }
  return {
    path: url,
    status: res.status,
    location: res.headers.get("location") || "",
  };
}

export default function NetProbe() {
  const [rows, setRows] = React.useState<Array<{path:string;status:number;location:string}>>([]);
  const [running, setRunning] = React.useState(false);

  async function run() {
    setRunning(true);
    const out: any[] = [];
    for (const r of ROUTES) out.push(await probe(r));
    setRows(out);
    setRunning(false);
  }

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={run} disabled={running}
          className="rounded-2xl px-4 py-2 shadow bg-black text-white disabled:opacity-40">
          {running ? "Läuft…" : "Netzwerk-Probe starten"}
        </button>
        <span className="opacity-70 text-sm">Profil: {import.meta.env.VITE_QA_PROFILE ?? "auth"}</span>
      </div>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-neutral-100">
            <th className="text-left p-2 border">Route</th>
            <th className="text-left p-2 border">Status</th>
            <th className="text-left p-2 border">Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td className="p-2 border"><code>{r.path}</code></td>
              <td className="p-2 border">{r.status}</td>
              <td className="p-2 border"><code>{r.location || "—"}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
