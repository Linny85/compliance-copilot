import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
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
        <main className="flex-1 flex flex-col overflow-auto">
          <DemoBanner />
          <TrialBanner tenantId={userInfo?.tenantId} />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
