import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAppMode } from "@/state/AppModeProvider";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { loading, userInfo } = useAuthGuard();
  const { mode } = useAppMode();
  const location = useLocation();

  // ✅ DEMO-MODUS: niemals zu /auth umleiten
  if (mode === "demo") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userInfo) {
    // Nur echte Prod/Trial-Fälle landen hier
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
