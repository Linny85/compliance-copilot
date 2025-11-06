import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppModeBanner } from "@/components/AppModeBanner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
          <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background sticky top-0 z-40">
            <SidebarTrigger />
            <LanguageSwitcher />
          </header>
          <main className="flex-1 flex flex-col overflow-auto">
            <AppModeBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
