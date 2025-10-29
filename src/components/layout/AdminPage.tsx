import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function AdminPage({
  title,
  subtitle,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
          {title && <h1 className="text-2xl font-semibold text-center">{title}</h1>}
          {subtitle && (
            <p className="text-muted-foreground text-center mt-1">{subtitle}</p>
          )}
          {children}
        </div>
      </main>
      
      {/* Debug badges - only visible when localStorage.debugBadges='1' in DEV mode */}
      {import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('debugBadges') === '1' && (
        <>
          <div className="fixed bottom-4 right-4 z-50 rounded bg-emerald-700 px-2 py-1 text-xs text-white shadow">
            AdminPage ACTIVE
          </div>
          <div className="fixed bottom-12 right-4 z-50 rounded bg-blue-700 px-2 py-1 text-xs text-white shadow">
            INDEX CSS ACTIVE
          </div>
        </>
      )}
    </SidebarProvider>
  );
}
