import { useAppMode } from "@/state/AppModeProvider";
import { toast } from "sonner";

/**
 * Hook to check if the app is in demo mode (read-only).
 * Use this to disable write operations in the UI.
 * 
 * @returns {Object} { isReadOnly: boolean, blockWrite: () => void }
 */
export function useReadOnly() {
  const { mode } = useAppMode();
  const isReadOnly = mode === "demo";

  const blockWrite = () => {
    if (isReadOnly) {
      toast.info("Demo-Modus: Schreibzugriff deaktiviert", {
        description: "Im Demo-Modus können keine Änderungen gespeichert werden.",
      });
      return true;
    }
    return false;
  };

  return { isReadOnly, blockWrite };
}
