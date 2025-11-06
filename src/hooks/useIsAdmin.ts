import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  useEffect(() => {
    let active = true;
    
    (async () => {
      // DEV-only e2e override
      if (import.meta.env.DEV) {
        const e2e = localStorage.getItem("e2e_isAdmin");
        if (e2e === "true") {
          if (active) setIsAdmin(true);
          return;
        }
        if (e2e === "false") {
          if (active) setIsAdmin(false);
          return;
        }
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }
      
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!profile?.company_id) {
        if (active) setIsAdmin(false);
        return;
      }
      
      // Check if user has admin or master_admin role
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .in('role', ['admin', 'master_admin']);
      
      if (active) {
        setIsAdmin(!error && roles && roles.length > 0);
      }
    })();
    
    return () => {
      active = false;
    };
  }, []);
  
  return isAdmin; // null = loading, true = admin, false = not admin
}
