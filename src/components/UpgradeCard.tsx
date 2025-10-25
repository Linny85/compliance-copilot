import { useState } from "react";
import { useUpgrade } from "../logic/useUpgrade";

export function UpgradeCard({ sessionToken, userId }: { sessionToken: string; userId: string }) {
  const upgrade = useUpgrade();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border-muted bg-surface-1 p-6">
      <h3 className="text-lg font-medium text-text-primary">Upgrade auf Abo</h3>
      <p className="mt-1 text-text-secondary">
        Deine Demo-Daten werden vollständig übernommen. Du arbeitest ohne Unterbrechung weiter.
      </p>
      <button
        className="mt-4 rounded-xl bg-text-primary/10 px-4 py-2 text-text-primary hover:bg-text-primary/15 disabled:opacity-50"
        disabled={busy}
        onClick={async () => {
          try {
            setBusy(true); 
            setMsg(null);
            await upgrade(sessionToken, userId);
            setMsg("Upgrade erfolgreich – Abo aktiv.");
          } catch (e: any) {
            setMsg("Upgrade fehlgeschlagen: " + (e?.message ?? String(e)));
          } finally { 
            setBusy(false); 
          }
        }}
      >
        {busy ? "Übernehme Daten…" : "Abo aktivieren & Daten behalten"}
      </button>
      {msg && <p className="mt-3 text-text-secondary">{msg}</p>}
    </div>
  );
}
