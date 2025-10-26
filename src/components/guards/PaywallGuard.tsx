import { Navigate, useLocation } from 'react-router-dom';
import { useAppMode } from '@/state/AppModeProvider';
import { useBillingStatus } from '@/hooks/useBilling';
import { Loader2 } from 'lucide-react';

interface PaywallGuardProps {
  children: React.ReactNode;
  tenantId?: string | null;
}

export function PaywallGuard({ children, tenantId }: PaywallGuardProps) {
  const { mode } = useAppMode();
  const { data, loading } = useBillingStatus(tenantId);
  const location = useLocation();

  // Demo-Modus hat freie Fahrt
  if (mode === 'demo') return <>{children}</>;

  // Billing-Seite ist immer erreichbar
  if (location.pathname.startsWith('/billing')) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allowed = data?.paid_active || data?.trial_active;
  if (allowed) return <>{children}</>;

  return <Navigate to="/billing" replace />;
}
