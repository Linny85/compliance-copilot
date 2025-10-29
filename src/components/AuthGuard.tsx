import { ReactNode, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getAppMode } from "@/config/appMode";
import { Loader2 } from "lucide-react";
import { isDemo } from "@/lib/isDemo";

interface AuthGuardProps {
  children: ReactNode;
}

// Public + Demo routes that don't require authentication
const PUBLIC_ROUTES = new Set<string>([
  '/', '/auth', '/auth/neu', '/legal/imprint', '/privacy', '/terms'
]);

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { loading, userInfo } = useAuthGuard();
  const mode = getAppMode();
  const location = useLocation();
  const navigate = useNavigate();
  
  const redirecting = useRef(false);
  const lastPath = useRef(location.pathname);

  useEffect(() => {
    // Demo: Set flag when entering /auth/neu, never redirect
    if (mode === "demo") {
      if (location.pathname.startsWith('/auth/neu')) {
        const { setDemoMode } = require('@/lib/isDemo');
        setDemoMode(true);
      }
      return;
    }
    
    // Wait for session state to be stable
    if (loading) return;
    
    // Prevent double-fire
    if (redirecting.current) return;

    // 1) Not logged in → only redirect if route is NOT public and NOT demo
    if (!userInfo) {
      const path = location.pathname;
      const isPublic = PUBLIC_ROUTES.has(path) || path.startsWith('/public/');
      if (!isPublic && !isDemo()) {
        redirecting.current = true;
        navigate("/auth", { replace: true, state: { from: location } });
        const timer = setTimeout(() => { redirecting.current = false; }, 400);
        return () => clearTimeout(timer);
      }
      // No redirect on /auth/neu or demo routes
    }

    // 2) Logged in and still on /auth → redirect to intended destination or dashboard
    if (userInfo && location.pathname === "/auth") {
      const to = (location.state as any)?.from?.pathname && 
                 (location.state as any).from.pathname !== "/auth"
        ? (location.state as any).from.pathname
        : "/dashboard";
      
      if (to !== lastPath.current) {
        redirecting.current = true;
        navigate(to, { replace: true });
        const timer = setTimeout(() => { redirecting.current = false; }, 400);
        return () => clearTimeout(timer);
      }
    }

    // 3) Handle onboarding/billing redirects
    if (userInfo && userInfo.userId) {
      const info = userInfo as any;
      
      if (!info.tenantId && location.pathname !== '/company-profile') {
        redirecting.current = true;
        navigate('/company-profile', { replace: true });
        const timer = setTimeout(() => { redirecting.current = false; }, 400);
        return () => clearTimeout(timer);
      }
      
      if (info.tenantId && location.pathname === '/company-profile') {
        redirecting.current = true;
        navigate('/dashboard', { replace: true });
        const timer = setTimeout(() => { redirecting.current = false; }, 400);
        return () => clearTimeout(timer);
      }
      
      const hasAccess = info.paidActive || info.trialActive;
      
      if (info.tenantId && !hasAccess && location.pathname !== '/billing') {
        redirecting.current = true;
        navigate('/billing', { replace: true });
        const timer = setTimeout(() => { redirecting.current = false; }, 400);
        return () => clearTimeout(timer);
      }
      
      if (info.tenantId && hasAccess && location.pathname === '/billing') {
        redirecting.current = true;
        navigate('/dashboard', { replace: true });
        const timer = setTimeout(() => { redirecting.current = false; }, 400);
        return () => clearTimeout(timer);
      }
    }

    lastPath.current = location.pathname;
  }, [mode, loading, userInfo, location.pathname, location.state, navigate]);

  // Demo: always allow
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

  return <>{children}</>;
};
