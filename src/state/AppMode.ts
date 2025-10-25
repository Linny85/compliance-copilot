export type AppMode = "demo" | "prod";

export const getInitialMode = (): AppMode =>
  (localStorage.getItem("appMode") as AppMode) || "demo";

export const setMode = (m: AppMode) => localStorage.setItem("appMode", m);
