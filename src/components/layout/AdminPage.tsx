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
      <div className="grid grid-cols-[var(--sidebar-width)_1fr] min-h-screen">
        <aside className="col-start-1 col-end-2">
          <AppSidebar />
        </aside>
        
        <div className="col-start-2 col-end-3 min-w-0">
          <main className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
            {title && <h1 className="text-2xl font-semibold text-center">{title}</h1>}
            {subtitle && (
              <p className="text-muted-foreground text-center mt-2">{subtitle}</p>
            )}
            <div className="mt-6">{children}</div>
          </main>
        </div>
      </div>
      
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
