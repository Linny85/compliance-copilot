import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppMode } from "@/state/AppModeProvider";
import i18n from "@/i18n/init";

interface UserInfo {
  userId: string;
  email: string;
  tenantId: string | null;
  role: string | null;
  subscriptionStatus?: string | null;
}

export const useAuthGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Wait for i18n to be ready before running auth checks
    if (!i18n.isInitialized) {
      return;
    }

    // Skip if multiple guards trying to run simultaneously
    if ((window as any).__auth_guard_running) return;
    (window as any).__auth_guard_running = true;
    setTimeout(() => ((window as any).__auth_guard_running = false), 200);

    checkAuthAndRedirect();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuthAndRedirect();
      } else if (event === 'SIGNED_OUT') {
        setUserInfo(null);
        setLoading(false);
        if (mode !== 'demo' && location.pathname !== '/auth' && location.pathname !== '/') {
          navigate('/auth');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location.pathname, mode]);

  const checkAuthAndRedirect = async () => {
    try {
      // Skip all auth checks in demo mode
      if (mode === 'demo') {
        const hasOrg = !!localStorage.getItem("demo_org_profile_v1");
        const hasCodes = !!localStorage.getItem("demo_org_codes_v1");

        // Prevent redirect loop: never navigate away from onboarding
        if (location.pathname === '/onboarding') {
          setLoading(false);
          setUserInfo(null);
          return;
        }

        // Redirect to onboarding if demo data is missing
        if (!(hasOrg && hasCodes)) {
          navigate('/onboarding', { replace: true });
          setLoading(false);
          return;
        }

        // Demo complete: allow normal navigation
        setLoading(false);
        setUserInfo(null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        setUserInfo(null);
        // Only redirect to auth if not on public pages
        if (location.pathname !== '/auth' && location.pathname !== '/') {
          navigate('/auth');
        }
        return;
      }

      // Fetch user info including tenantId
      const { data, error } = await supabase.functions.invoke('get-user-info');

      if (error) {
        console.error('Auth guard: get-user-info error:', error);
        setLoading(false);
        return;
      }

      const info: UserInfo = data;

      // Fetch subscription status using view (no custom claims needed)
      if (info.userId) {
        const { data: subData } = await supabase
          .from('v_me_subscription')
          .select('status')
          .maybeSingle();

        info.subscriptionStatus = subData?.status || null;
      }
      
      setUserInfo(info);

      // Check if subscription is required
      const hasActiveSubscription = info.subscriptionStatus && 
        ['active', 'trialing'].includes(info.subscriptionStatus);
      
      // Routing logic based on tenantId and subscription
      if (!info.tenantId && location.pathname !== '/company-profile') {
        navigate('/company-profile');
      } else if (info.tenantId && location.pathname === '/company-profile') {
        navigate('/dashboard');
      } else if (info.tenantId && !hasActiveSubscription && location.pathname !== '/billing') {
        navigate('/billing');
      } else if (info.tenantId && hasActiveSubscription && location.pathname === '/billing') {
        navigate('/dashboard');
      } else if (info.tenantId && (location.pathname === '/auth' || location.pathname === '/')) {
        // Authenticated user with tenant on auth/landing page, redirect appropriately
        if (hasActiveSubscription) {
          navigate('/dashboard');
        } else {
          navigate('/billing');
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth guard error:', error);
      setLoading(false);
    }
  };

  return { loading, userInfo };
};
