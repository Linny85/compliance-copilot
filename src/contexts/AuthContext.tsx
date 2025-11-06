import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";

type Role = 'viewer' | 'member' | 'manager' | 'admin';

interface AuthContextType {
  authReady: boolean;
  user: User | null;
  tenantId: string | null;
  hasRole: (need: Role) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  authReady: false,
  user: null,
  tenantId: null,
  hasRole: () => false
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchUserTenant(session?.user?.id);
      setAuthReady(true);
      
      // Set Sentry user context
      if (session?.user) {
        setSentryUser(session.user.id, session.user.email);
      } else {
        clearSentryUser();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      fetchUserTenant(session?.user?.id);
      setAuthReady(true);
      
      // Update Sentry user context
      if (session?.user) {
        setSentryUser(session.user.id, session.user.email);
      } else {
        clearSentryUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserTenant = async (userId?: string) => {
    if (!userId) {
      setTenantId(null);
      return;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle();
      
      const companyId = data?.company_id ?? null;
      setTenantId(companyId);
      
      // Update Sentry context with tenant ID
      if (companyId) {
        setSentryUser(userId, undefined, companyId);
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      setTenantId(null);
    }
  };

  const hasRole = (need: Role): boolean => {
    if (!user) return false;
    
    // Get roles from user metadata or user_roles table
    // For now, simplified: check app_metadata.roles
    const roles: Role[] = (user.app_metadata?.roles ?? ['viewer']) as Role[];
    const roleOrder: Role[] = ['viewer', 'member', 'manager', 'admin'];
    
    const currentRole = roles[0] ?? 'viewer';
    const currentIndex = roleOrder.indexOf(currentRole);
    const neededIndex = roleOrder.indexOf(need);
    
    return currentIndex >= neededIndex;
  };

  return (
    <AuthContext.Provider value={{ authReady, user, tenantId, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
