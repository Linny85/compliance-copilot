import * as React from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const logs: Array<{t:string; path:string; nav:string}> = [];

export default function RedirectTracer() {
  const loc = useLocation();
  const nav = useNavigationType();

  React.useEffect(() => {
    const t = new Date().toISOString().split("T")[1].replace("Z","");
    logs.push({ t, path: loc.pathname + loc.search, nav });
    // Zeige nur die letzten 12 Einträge
    if (logs.length > 12) logs.splice(0, logs.length - 12);
    // Konsolen-Ausgabe für Timeline-Debugging
    // eslint-disable-next-line no-console
    console.debug("[QA][route]", t, nav, loc.pathname + loc.search);
  }, [loc, nav]);

  return (
    <div
      style={{
        position: "fixed", bottom: 12, right: 12, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", color: "white",
        padding: "10px 12px", borderRadius: 12, fontSize: 12,
        maxWidth: 380, maxHeight: 240, overflow: "auto",
        boxShadow: "0 4px 18px rgba(0,0,0,0.3)"
      }}
    >
      <div style={{opacity:.8, marginBottom:6}}>
        QA Redirect Trace • Profil: {import.meta.env.VITE_QA_PROFILE ?? "auth"}
      </div>
      <ul style={{margin:0, padding:0, listStyle:"none"}}>
        {logs.slice().reverse().map((l, i) => (
          <li key={i} style={{marginBottom:4}}>
            <span style={{opacity:.8}}>{l.t}</span>{" "}
            <span style={{background:"#111", padding:"1px 6px", borderRadius:6}}>{l.nav}</span>{" "}
            <code>{l.path}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
