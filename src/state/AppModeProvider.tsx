import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type AppMode = "demo" | "trial" | "prod";
type Ctx = { mode: AppMode; switchTo: (m: AppMode) => void };

const AppModeContext = createContext<Ctx | null>(null);
const MODE_KEY = "appMode";

const getInitialMode = (): AppMode => {
  if (typeof window === "undefined") return "demo";
  const stored = window.localStorage.getItem(MODE_KEY) as AppMode | null;
  return stored === "demo" || stored === "trial" || stored === "prod" ? stored : "demo";
};

const setMode = (m: AppMode) => {
  if (typeof window !== "undefined") window.localStorage.setItem(MODE_KEY, m);
};

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, set] = useState<AppMode>(getInitialMode());

  // Auto-sync mode with billing status
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: billingStatus } = useQuery({
    queryKey: ['billing-status', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data } = await supabase
        .from('v_billing_status' as any)
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.company_id,
  });

  useEffect(() => {
    if (!billingStatus) return;
    
    let newMode: AppMode = "demo";
    if ((billingStatus as any).paid_active) {
      newMode = "prod";
    } else if ((billingStatus as any).trial_active) {
      newMode = "trial";
    }
    
    if (newMode !== mode) {
      set(newMode);
      setMode(newMode);
    }
  }, [billingStatus, mode]);

  const value = useMemo(
    () => ({
      mode,
      switchTo: (m: AppMode) => {
        set(m);
        setMode(m);
      },
    }),
    [mode]
  );
  
  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export const useAppMode = () => {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within <AppModeProvider>");
  return ctx;
};
