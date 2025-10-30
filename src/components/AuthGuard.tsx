import { ReactNode, useRef } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { loading, userInfo } = useAuthGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const lastNavRef = useRef(0);

  // Debounced navigation to prevent double-redirects
  const safeNavigate = (to: string, opts?: any) => {
    const now = Date.now();
    if (now - lastNavRef.current < 500) return;
    lastNavRef.current = now;
    navigate(to, opts);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Define public routes
  const PUBLIC_ROUTES = new Set(["/", "/auth"]);
  const isPublic = PUBLIC_ROUTES.has(location.pathname) || location.pathname.startsWith("/public/");

  // Redirect to auth if not authenticated and not on public route
  if (!userInfo && !isPublic) {
    safeNavigate("/auth", { replace: true, state: { from: location } });
    return null;
  }

  return <>{children}</>;
};
