import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  useEffect(() => {
    let active = true;
    
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      
      if (active) {
        setIsAdmin(!error && data?.role === 'admin');
      }
    })();
    
    return () => {
      active = false;
    };
  }, []);
  
  return isAdmin; // null = loading, true = admin, false = not admin
}
