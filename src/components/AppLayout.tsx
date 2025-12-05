import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppModeBanner } from "@/components/AppModeBanner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TenantSelector from "@/components/TenantSelector";
import TenantLicenseBadge from "@/components/TenantLicenseBadge";
import TenantLicenseNotice from "@/components/TenantLicenseNotice";

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
          <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background sticky top-0 z-40" data-testid="app-header" role="banner">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              <TenantLicenseBadge />
              <TenantSelector />
              <LanguageSwitcher />
            </div>
          </header>
          <main className="flex-1 flex flex-col overflow-auto" role="main">
            <AppModeBanner />
            <TenantLicenseNotice />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
