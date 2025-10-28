import { ReactNode, useMemo, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import LayoutDiagnosticsPanel from '@/debug/LayoutDiagnosticsPanel';

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const debugLayout = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "layout",
    []
  );

  useEffect(() => {
    if (debugLayout) {
      import("@/debug/markOverflow").then((m) => m.markOverflowOffenders());
    }
  }, [debugLayout]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* data-app-main: einfacher Haken für spätere Diagnostik/Styles */}
        <main
          data-app-main
          className="min-w-0 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-clip"
        >
          {children}
        </main>

        <LayoutDiagnosticsPanel enabled={!!debugLayout} />
      </SidebarInset>
    </SidebarProvider>
  );
}
