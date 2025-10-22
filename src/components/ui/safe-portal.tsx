import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { safeRemove } from "@/lib/dom/safeCleanup";

interface SafePortalProps {
  children: React.ReactNode;
  container?: HTMLElement | null;
}

/**
 * A safe portal component that handles cleanup properly
 * to prevent "Failed to execute 'removeChild'" errors
 */
export function SafePortal({ children, container }: SafePortalProps) {
  const defaultContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container) {
      // Create default container
      const div = document.createElement("div");
      div.setAttribute("data-safe-portal", "true");
      document.body.appendChild(div);
      defaultContainer.current = div;

      return () => {
        // Safe cleanup of portal container
        if (defaultContainer.current) {
          safeRemove(defaultContainer.current);
          defaultContainer.current = null;
        }
      };
    }
  }, [container]);

  const targetContainer = container || defaultContainer.current;

  if (!targetContainer) {
    return null;
  }

  return createPortal(children, targetContainer);
}
