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

const DEMO_USER: UserInfo = {
  userId: "demo-user-id",
  email: "demo@norrland.example",
  tenantId: "demo-tenant-id",
  role: "viewer",
  subscriptionStatus: "active",
};

export const useAuthGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Skip all auth checks in demo mode
    if (mode === 'demo') {
      setUserInfo(DEMO_USER);
      setLoading(false);
      return;
    }

    checkAuthAndRedirect();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuthAndRedirect();
      } else if (event === 'SIGNED_OUT') {
        setUserInfo(null);
        setLoading(false);
        if (location.pathname !== '/auth' && location.pathname !== '/') {
          navigate('/auth', { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, mode]);

  const checkAuthAndRedirect = async () => {
    try {
      // Demo short-circuit: never redirect or query auth in demo
      if (mode === 'demo') {
        setUserInfo(DEMO_USER);
        setLoading(false);
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
      
      // Fetch subscription AND billing status using views
      if (info.userId && info.tenantId) {
        const [subRes, billingRes] = await Promise.all([
          supabase.from('v_me_subscription').select('status').maybeSingle(),
          supabase.from('v_billing_status' as any).select('trial_active, paid_active').eq('company_id', info.tenantId).maybeSingle()
        ]);
        
        info.subscriptionStatus = subRes.data?.status || null;
        
        // Check if trial or paid is active
        const trialActive = (billingRes.data as any)?.trial_active || false;
        const paidActive = (billingRes.data as any)?.paid_active || false;
        const hasAccess = paidActive || trialActive;
        
        // Routing logic based on tenantId and access
        if (!info.tenantId && location.pathname !== '/company-profile') {
          // User has no tenant, redirect to onboarding
          navigate('/company-profile');
        } else if (info.tenantId && location.pathname === '/company-profile') {
          // User has tenant but is on onboarding page, redirect to dashboard
          navigate('/dashboard');
        } else if (info.tenantId && !hasAccess && location.pathname !== '/billing') {
          // User has tenant but no trial/paid access, redirect to billing
          navigate('/billing');
        } else if (info.tenantId && hasAccess && location.pathname === '/billing') {
          // User has active trial/paid but is on billing page, redirect to dashboard
          navigate('/dashboard');
        } else if (info.tenantId && (location.pathname === '/auth' || location.pathname === '/')) {
          // Authenticated user with tenant on auth/landing page, redirect appropriately
          if (hasAccess) {
            navigate('/dashboard');
          } else {
            navigate('/billing');
          }
        }
      } else {
        // No tenantId or userId - redirect to onboarding
        if (location.pathname !== '/company-profile') {
          navigate('/company-profile');
        }
      }
      
      setUserInfo(info);

      setLoading(false);
    } catch (error) {
      console.error('Auth guard error:', error);
      setLoading(false);
    }
  };

  return { loading, userInfo };
};
