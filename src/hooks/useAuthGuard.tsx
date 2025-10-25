import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppMode } from "@/state/AppModeProvider";

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
    checkAuthAndRedirect();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuthAndRedirect();
      } else if (event === 'SIGNED_OUT') {
        setUserInfo(null);
        setLoading(false);
        if (location.pathname !== '/auth' && location.pathname !== '/') {
          navigate('/auth');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname]);

  const checkAuthAndRedirect = async () => {
    try {
      // If in demo mode, skip all auth checks
      if (mode === 'demo') {
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
        console.error('Error fetching user info:', error);
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
        // User has no tenant, redirect to onboarding
        navigate('/company-profile');
      } else if (info.tenantId && location.pathname === '/company-profile') {
        // User has tenant but is on onboarding page, redirect to dashboard
        navigate('/dashboard');
      } else if (info.tenantId && !hasActiveSubscription && location.pathname !== '/billing') {
        // User has tenant but no active subscription, redirect to billing
        navigate('/billing');
      } else if (info.tenantId && hasActiveSubscription && location.pathname === '/billing') {
        // User has active subscription but is on billing page, redirect to dashboard
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
