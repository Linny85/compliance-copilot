import { useAppMode } from "../state/AppModeProvider";
import { DemoAdapter } from "./adapters/DemoAdapter";
import { ProdAdapter } from "./adapters/ProdAdapter";
import { Repository } from "./types";

export function useRepository(token?: string): Repository {
  const { mode } = useAppMode();
  return mode === "demo" ? new DemoAdapter() : new ProdAdapter(token ?? "");
}
