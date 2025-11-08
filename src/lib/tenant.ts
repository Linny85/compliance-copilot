import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve tenant ID with fallback chain:
 * 1. JWT claim (app_metadata or user_metadata)
 * 2. Profile company_id
 * 3. localStorage fallback
 */
export async function resolveTenantId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1) Try JWT claim
    const { data: { session } } = await supabase.auth.getSession();
    const claim = session?.user?.app_metadata?.tenant_id || session?.user?.user_metadata?.tenant_id;
    if (claim) return claim;

    // 2) Try profile
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (data?.[0]?.company_id) return data[0].company_id as string;
    } catch (profileError) {
      console.warn('Profile lookup failed:', profileError);
    }

    // 3) Fallback: localStorage
    return typeof localStorage !== 'undefined' ? localStorage.getItem('tenant_id') : null;
  } catch (error) {
    console.error('Error resolving tenant ID:', error);
    return null;
  }
}

/**
 * Get the tenant ID for the current user
 * Returns company_id from profiles (which serves as tenant_id)
 * @deprecated Use resolveTenantId() for robust tenant resolution
 */
export async function getTenantId(): Promise<string | null> {
  return resolveTenantId();
}
