import { useAppMode } from "@/state/AppModeProvider";

/**
 * Hook to check if the app is in demo mode (read-only).
 * Use this to disable write operations in the UI.
 */
export function useReadOnly(): boolean {
  const { mode } = useAppMode();
  return mode === "demo";
}
