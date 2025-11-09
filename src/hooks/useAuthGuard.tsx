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
        // If unauthorized, clear session and redirect to auth
        if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
          await supabase.auth.signOut();
          setUserInfo(null);
          setLoading(false);
          navigate('/auth');
          return;
        }
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
        
        // Check if on company-profile page with mode parameter
        const isCompanyProfile = location.pathname === '/company-profile';
        const params = new URLSearchParams(location.search);
        const mode = params.get('mode'); // 'create' | 'edit' | null
        
        // Routing logic based on tenantId and access
        if (!info.tenantId && location.pathname !== '/company-profile') {
          // User has no tenant, redirect to onboarding
          navigate('/company-profile?mode=create');
        } else if (info.tenantId && location.pathname === '/organization') {
          // User has tenant and is on /organization - stay there (read-only or edit mode handled in-page)
          // No redirect needed
        } else if (info.tenantId && isCompanyProfile && !(mode === 'create' || mode === 'edit')) {
          // User has tenant and is on company-profile without explicit mode → redirect to read-only view
          navigate('/organization', { replace: true });
        } else if (info.tenantId && !hasAccess && location.pathname !== '/billing') {
          // User has tenant but no trial/paid access, redirect to billing
          navigate('/billing');
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
