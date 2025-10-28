import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen">
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
      {/* CRITICAL: min-w-0 prevents horizontal overflow from wide children */}
      <div className="flex-1 min-w-0">
        <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
