import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppModeBanner } from "@/components/AppModeBanner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useLayoutGuard } from "@/hooks/useLayoutGuard";
import { getAppMode } from "@/config/appMode";

/**
 * Shared layout for all authenticated routes
 * Grid-based layout: Sidebar (sticky) | Content
 */
export function AppLayout() {
  const mode = getAppMode();
  
  // Demo: skip guards entirely
  if (mode !== 'demo') {
    useLayoutGuard("AppLayout");
    useAuthGuard();
  }
  
  return (
    <SidebarProvider>
      <div className="grid min-h-svh w-full [--sidebar-width:16rem] grid-cols-1 md:grid-cols-[var(--sidebar-width)_1fr]">
        {/* Col 1: Sidebar */}
        <aside className="hidden md:block md:col-start-1 md:row-start-1 sticky top-0 h-svh overflow-y-auto border-r bg-background">
          <AppSidebar />
        </aside>

        {/* Col 2: Content */}
        <main id="app-main" className="col-start-1 md:col-start-2 md:row-start-1">
          <AppModeBanner />
          <Outlet />
          
          {/* Dev Badge */}
          {import.meta.env.DEV && (
            <div className="fixed bottom-2 right-2 z-50 rounded bg-muted px-2 py-1 text-xs text-muted-foreground shadow">
              Layout ✅
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
