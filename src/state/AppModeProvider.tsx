import { createContext, useContext, useMemo, useState } from "react";
import { AppMode, getInitialMode, setMode } from "./AppMode";

type Ctx = { mode: AppMode; switchTo: (m: AppMode) => void };
const AppModeContext = createContext<Ctx | null>(null);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, set] = useState<AppMode>(getInitialMode());
  const value = useMemo(
    () => ({ mode, switchTo: (m: AppMode) => { set(m); setMode(m); } }),
    [mode]
  );
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export const useAppMode = () => {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode outside provider");
  return ctx;
};
