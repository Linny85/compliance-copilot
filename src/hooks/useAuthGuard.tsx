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
    console.log('[Diag][AuthGuard] effect run', { pathname: location.pathname, mode, i18nInit: i18n.isInitialized });
    // Wait for i18n to be ready before running auth checks
    if (!i18n.isInitialized) {
      console.log('[Diag][AuthGuard] defer: i18n not initialized yet');
      return;
    }

    checkAuthAndRedirect();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[Diag][AuthGuard] auth event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuthAndRedirect();
      } else if (event === 'SIGNED_OUT') {
        setUserInfo(null);
        setLoading(false);
        if (mode !== 'demo' && location.pathname !== '/auth' && location.pathname !== '/') {
          console.warn('[Diag][AuthGuard] navigate -> /auth (SIGNED_OUT)');
          navigate('/auth');
        }
      }
    });

    return () => {
      console.log('[Diag][AuthGuard] cleanup auth subscription');
      subscription.unsubscribe();
    };
  }, [location.pathname, mode]);

  const checkAuthAndRedirect = async () => {
    try {
      console.log('[Diag][AuthGuard] checkAuthAndRedirect:start', { pathname: location.pathname, mode });

      // Skip all auth checks in demo mode
      if (mode === 'demo') {
        const hasOrg = !!localStorage.getItem("demo_org_profile_v1");
        const hasCodes = !!localStorage.getItem("demo_org_codes_v1");
        console.log('[Diag][AuthGuard] demo mode', { hasOrg, hasCodes, pathname: location.pathname });

        // Only redirect to onboarding if demo data is missing AND not already there
        if (!(hasOrg && hasCodes) && location.pathname !== '/onboarding') {
          console.warn('[Diag][AuthGuard] navigate -> /onboarding (demo missing data)');
          navigate('/onboarding', { replace: true });
          setLoading(false);
          return;
        }

        setLoading(false);
        setUserInfo(null);
        console.log('[Diag][AuthGuard] demo mode: allow render, no redirects');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Diag][AuthGuard] session', { present: !!session });

      if (!session) {
        setLoading(false);
        setUserInfo(null);
        // Only redirect to auth if not on public pages
        if (location.pathname !== '/auth' && location.pathname !== '/') {
          console.warn('[Diag][AuthGuard] navigate -> /auth (no session)');
          navigate('/auth');
        }
        return;
      }

      console.log('[Diag][AuthGuard] fetch get-user-info');
      // Fetch user info including tenantId
      const { data, error } = await supabase.functions.invoke('get-user-info');

      if (error) {
        console.error('[Diag][AuthGuard] get-user-info error:', error);
        setLoading(false);
        return;
      }

      const info: UserInfo = data;
      console.log('[Diag][AuthGuard] user info', { tenantId: info.tenantId, subscriptionStatus: info.subscriptionStatus });

      // Fetch subscription status using view (no custom claims needed)
      if (info.userId) {
        const { data: subData } = await supabase
          .from('v_me_subscription')
          .select('status')
          .maybeSingle();

        info.subscriptionStatus = subData?.status || null;
        console.log('[Diag][AuthGuard] subscription status', info.subscriptionStatus);
      }
      
      setUserInfo(info);

      // Check if subscription is required
      const hasActiveSubscription = info.subscriptionStatus && 
        ['active', 'trialing'].includes(info.subscriptionStatus);
      
      // Routing logic based on tenantId and subscription
      if (!info.tenantId && location.pathname !== '/company-profile') {
        console.warn('[Diag][AuthGuard] navigate -> /company-profile (no tenant)');
        navigate('/company-profile');
      } else if (info.tenantId && location.pathname === '/company-profile') {
        console.warn('[Diag][AuthGuard] navigate -> /dashboard (has tenant on company-profile)');
        navigate('/dashboard');
      } else if (info.tenantId && !hasActiveSubscription && location.pathname !== '/billing') {
        console.warn('[Diag][AuthGuard] navigate -> /billing (no active subscription)');
        navigate('/billing');
      } else if (info.tenantId && hasActiveSubscription && location.pathname === '/billing') {
        console.warn('[Diag][AuthGuard] navigate -> /dashboard (active subscription on billing)');
        navigate('/dashboard');
      } else if (info.tenantId && (location.pathname === '/auth' || location.pathname === '/')) {
        // Authenticated user with tenant on auth/landing page, redirect appropriately
        if (hasActiveSubscription) {
          console.warn('[Diag][AuthGuard] navigate -> /dashboard (authed)');
          navigate('/dashboard');
        } else {
          console.warn('[Diag][AuthGuard] navigate -> /billing (authed, no active sub)');
          navigate('/billing');
        }
      }

      setLoading(false);
      console.log('[Diag][AuthGuard] done');
    } catch (error) {
      console.error('Auth guard error:', error);
      setLoading(false);
    }
  };

  return { loading, userInfo };
};
