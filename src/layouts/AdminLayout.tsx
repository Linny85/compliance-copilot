import React, { ReactNode, useMemo, useEffect } from 'react';
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
        {/* DEBUG-Badge: zeigt, ob dieses Layout wirklich aktiv ist */}
        {process.env.NODE_ENV !== "production" && (
          <div style={{
            position:"fixed", top:6, right:6, zIndex:99999,
            background:"#111", color:"#0f0", padding:"4px 8px", borderRadius:6
          }}>
            AdminLayout ACTIVE
          </div>
        )}

        {/* HARTER KANAL – unabhängig von Tailwind */}
        <main
          data-app-main
          className="min-w-0 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6"
          style={{
            maxWidth: "1280px",
            overflowX: "clip",
            display: "block",
            position: "relative"
          }}
        >
          {/* zusätzliches Min-Wrap, damit Kinder nicht „aufblähen" */}
          <div className="min-w-0">{children}</div>
        </main>

        <LayoutDiagnosticsPanel enabled={!!debugLayout} />
      </SidebarInset>
    </SidebarProvider>
  );
}
