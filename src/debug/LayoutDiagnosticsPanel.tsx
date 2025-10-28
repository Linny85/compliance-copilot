import React, { useEffect, useState } from "react";
import { useLayoutDiagnostics } from "./useLayoutDiagnostics";

export default function LayoutDiagnosticsPanel({ enabled }: { enabled: boolean }) {
  const { collectNow } = useLayoutDiagnostics(enabled);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!enabled) return;
    const res = collectNow();
    setData(res);
  }, [enabled, collectNow]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        maxWidth: 420,
        background: "rgba(0,0,0,0.8)",
        color: "#fff",
        padding: "12px 14px",
        borderRadius: 12,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Layout Diagnostics</div>
      <pre style={{ whiteSpace: "pre-wrap", maxHeight: 260, overflow: "auto", margin: 0 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={() => {
            const res = collectNow();
            setData(res);
          }}
          style={{ padding: "6px 10px", borderRadius: 8, background: "#2d9", border: "none" }}
        >
          Refresh
        </button>
        <button
          onClick={() => {
            try {
              navigator.clipboard.writeText(JSON.stringify((window as any).__layoutDiag, null, 2));
            } catch {}
          }}
          style={{ padding: "6px 10px", borderRadius: 8, background: "#29c", border: "none" }}
        >
          Copy JSON
        </button>
      </div>
    </div>
  );
}
