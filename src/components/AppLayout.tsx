import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DemoBanner } from "@/components/DemoBanner";

/**
 * Shared layout for all authenticated routes
 * Provides persistent sidebar navigation across all pages
 */
export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <DemoBanner />
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
