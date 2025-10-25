import { useAppMode } from "@/state/AppModeProvider";
import { seedDemo } from "@/data/seed";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function DemoStartButton() {
  const { switchTo } = useAppMode();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 md:text-base"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true);
          switchTo("demo");
          await seedDemo();
          nav("/demo");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Demo wird vorbereitet…" : "Demo starten"}
    </button>
  );
}
