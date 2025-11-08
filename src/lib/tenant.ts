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
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profile?.company_id) return profile.company_id;

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
