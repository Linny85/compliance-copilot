import { useState } from "react";
import { useUpgrade } from "../logic/useUpgrade";

export function UpgradeCard({ sessionToken, userId }: { sessionToken: string; userId?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const upgrade = useUpgrade();

  return (
    <div className="rounded-2xl border border-border-muted bg-surface-1 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary">Upgrade auf Abo</h3>
      <p className="mt-1 text-sm text-text-secondary">
        Deine Demo-Daten werden vollständig übernommen. Du arbeitest ohne Unterbrechung weiter.
      </p>

      <button
        className="mt-4 rounded-xl border border-border-muted bg-surface-2 px-4 py-2 text-text-primary transition hover:bg-surface-3 disabled:opacity-60"
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

      {msg && <div className="mt-3 text-sm text-text-secondary">{msg}</div>}
    </div>
  );
}
