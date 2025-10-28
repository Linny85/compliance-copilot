import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="w-full mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
