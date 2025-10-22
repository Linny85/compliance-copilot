import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* Safe Portal utilities to avoid DOM removeChild errors */
export function safeRemove(node: HTMLElement | null) {
  try {
    if (!node) return;
    const parent = node.parentNode as (Node & { contains?: (n:Node)=>boolean }) | null;
    if (!parent) return;
    // Nur entfernen, wenn der Knoten wirklich Kind des Parents ist
    if (typeof parent.contains === 'function' && !parent.contains(node)) return;
    parent.removeChild(node);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // In DEV nur loggen, nie crashen
      console.warn('[safeRemove skipped]', err);
    }
  }
}

/** optional: helper to create a portal container */
export function ensurePortalContainer(attr = 'data-safe-portal'): HTMLElement {
  let el = document.querySelector<HTMLElement>(`[${attr}]`);
  if (!el) {
    el = document.createElement('div');
    el.setAttribute(attr, 'true');
    document.body.appendChild(el);
  }
  return el;
}

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
