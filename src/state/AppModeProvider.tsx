import React, { createContext, useContext, useMemo, useState } from "react";

export type AppMode = "demo" | "prod";
type Ctx = { mode: AppMode; switchTo: (m: AppMode) => void };

const AppModeContext = createContext<Ctx | null>(null);
const MODE_KEY = "appMode";

const getInitialMode = (): AppMode => {
  if (typeof window === "undefined") return "demo";
  const stored = window.localStorage.getItem(MODE_KEY) as AppMode | null;
  const resolved = stored === "demo" || stored === "prod" ? stored : "demo";
  try { console.log("[Diag][AppMode] getInitialMode", { stored, resolved }); } catch {}
  return resolved;
};

const setMode = (m: AppMode) => {
  if (typeof window !== "undefined") window.localStorage.setItem(MODE_KEY, m);
};

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, set] = useState<AppMode>(getInitialMode());
  const value = useMemo(
    () => ({
      mode,
      switchTo: (m: AppMode) => {
        console.log("[Diag][AppMode] switchTo:", m);
        set(m);
        setMode(m);
      },
    }),
    [mode]
  );
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export const useAppMode = () => {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within <AppModeProvider>");
  return ctx;
};
