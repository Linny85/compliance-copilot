import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Loader2, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RequireAdminProps {
  children: ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { authReady, user } = useAuth();
  const isAdmin = useIsAdmin();
  const { t } = useTranslation('common');

  // Wait for auth to be ready
  if (!authReady || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Not an admin - show friendly access denied page
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <ShieldAlert className="mb-6 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {t('adminAccess.denied')}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {t('adminAccess.message')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
