import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface AdminLayoutProps {
  children: ReactNode;
  maxWidth?: 'default' | 'wide'; // 'default' = 5xl, 'wide' = 6xl
}

export default function AdminLayout({ children, maxWidth = 'default' }: AdminLayoutProps) {
  const containerClass = maxWidth === 'wide' ? 'max-w-6xl' : 'max-w-5xl';
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        {/* CRITICAL: min-w-0 prevents horizontal overflow from wide children */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className={`container mx-auto ${containerClass} px-4 sm:px-6 lg:px-8 py-6`}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
