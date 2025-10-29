import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppModeBanner } from "@/components/AppModeBanner";
import { useAuthGuard } from "@/hooks/useAuthGuard";

/**
 * Shared layout for all authenticated routes
 * Grid-based layout: Sidebar (sticky) | Content
 */
export function AppLayout() {
  const { userInfo } = useAuthGuard();
  
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
        </main>
      </div>
    </SidebarProvider>
  );
}
