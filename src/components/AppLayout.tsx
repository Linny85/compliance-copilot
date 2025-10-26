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
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-auto">
          <DemoBanner />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
