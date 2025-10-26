import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DemoBanner } from "@/components/DemoBanner";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { useAuthGuard } from "@/hooks/useAuthGuard";

/**
 * Shared layout for all authenticated routes
 * Provides persistent sidebar navigation across all pages
 */
export function AppLayout() {
  const { userInfo } = useAuthGuard();
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <header className="h-12 flex items-center border-b border-border bg-background sticky top-0 z-40">
            <SidebarTrigger className="ml-2" />
          </header>
          <main className="flex-1 flex flex-col overflow-auto">
            <DemoBanner />
            <TrialBanner tenantId={userInfo?.tenantId} />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
