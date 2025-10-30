import { useEffect } from "react";

/**
 * Development-only layout regression guard.
 * Warns if AdminPages are rendered without proper layout context.
 */
export function useLayoutGuard(componentName: string) {
  if (import.meta.env.PROD) return; // Skip in production

  useEffect(() => {
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
