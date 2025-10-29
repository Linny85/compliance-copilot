import { useEffect } from "react";

// Public routes that don't need layout validation
const PUBLIC_ROUTES = new Set([
  '/', '/auth', '/auth/neu', '/legal/imprint', '/privacy', '/terms'
]);

/**
 * Development-only layout regression guard.
 * Warns if AdminPages are rendered without proper layout context.
 */
export function useLayoutGuard(componentName: string) {
  if (import.meta.env.PROD) return; // Skip in production

  useEffect(() => {
    // Skip validation for public routes
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (PUBLIC_ROUTES.has(path) || path.startsWith('/public/')) {
        return;
      }
    }

    const sidebarProviderFound = !!document.querySelector("[data-sidebar-provider]");
    const appLayoutFound = !!document.querySelector("#app-main");
    const containerFound = !!document.querySelector(".container.mx-auto.max-w-5xl");

    if (!sidebarProviderFound) {
      console.warn(`[LayoutGuard] ⚠️ SidebarProvider not detected in DOM (${componentName})`);
    }
    if (!appLayoutFound) {
      console.warn(`[LayoutGuard] ⚠️ AppLayout grid shell missing (${componentName})`);
    }
    if (!containerFound) {
      console.warn(`[LayoutGuard] ⚠️ AdminPage container missing or misaligned (${componentName})`);
    }
  }, [componentName]);
}
