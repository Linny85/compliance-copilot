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
    const { data } = await supabase.auth.getSession();
    const fromClaim: unknown =
      (data.session?.user as any)?.app_metadata?.tenant_id ??
      (data.session?.user as any)?.user_metadata?.tenant_id;
    if (typeof fromClaim === 'string' && fromClaim) return fromClaim;

    // 2) Try profile
    try {
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (profileData?.[0]?.company_id) return profileData[0].company_id as string;
    } catch (profileError) {
      console.warn('Profile lookup failed:', profileError);
    }

    // 3) Fallback: localStorage
    if (typeof localStorage !== 'undefined') {
      const ls = localStorage.getItem('tenant_id');
      if (ls) return ls;
    }
    return null;
  } catch (e) {
    console.error('Error resolving tenant ID:', e);
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
