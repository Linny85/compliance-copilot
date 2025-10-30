import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAppMode } from "@/config/appMode";
import { isDemo } from "@/lib/isDemo";
import { demoUser, demoTenant } from "@/demo/demoData";

interface UserInfo {
  userId: string;
  email: string;
  tenantId: string | null;
  role: string | null;
  subscriptionStatus?: string | null;
}

const DEMO_USER: UserInfo = {
  userId: demoUser.id,
  email: demoUser.email,
  tenantId: demoTenant.id,
  role: "owner",
  subscriptionStatus: "active",
};

// Simplified: only provides session state, NO navigation
export const useAuthGuard = () => {
  const [loading, setLoading] = useState(!isDemo());
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    // ⚡️ Synchronously seed demo as logged-in to avoid first-render redirects
    return isDemo() ? DEMO_USER : null;
  });

  useEffect(() => {
    // Demo: already seeded synchronously, skip async checks
    if (isDemo()) return;

    // Prod/Trial: check session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setUserInfo(null);
          setLoading(false);
          return;
        }

        // Fetch user info
        const { data, error } = await supabase.functions.invoke('get-user-info');
        if (error) {
          console.error('Error fetching user info:', error);
          setUserInfo(null);
          setLoading(false);
          return;
        }

        const info: UserInfo = data;
        
        // Fetch subscription status
        if (info.userId && info.tenantId) {
          const [subRes, billingRes] = await Promise.all([
            supabase.from('v_me_subscription').select('status').maybeSingle(),
            supabase.from('v_billing_status' as any).select('trial_active, paid_active').eq('company_id', info.tenantId).maybeSingle()
          ]);
          
          info.subscriptionStatus = subRes.data?.status || null;
          const trialActive = (billingRes.data as any)?.trial_active || false;
          const paidActive = (billingRes.data as any)?.paid_active || false;
          (info as any).hasAccess = paidActive || trialActive;
          (info as any).trialActive = trialActive;
          (info as any).paidActive = paidActive;
        }
        
        setUserInfo(info);
        setLoading(false);
      } catch (error) {
        console.error('Session check error:', error);
        setUserInfo(null);
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkSession();
      } else if (event === 'SIGNED_OUT') {
        setUserInfo(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { loading, userInfo };
};
