import { supabase } from '@/integrations/supabase/client';

/**
 * Get the tenant ID for the current user
 * Returns company_id from profiles (which serves as tenant_id)
 */
export async function getTenantId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    return profile?.company_id ?? null;
  } catch (error) {
    console.error('Error fetching tenant ID:', error);
    return null;
  }
}

/**
 * Build a flexible OR filter for querying views that support both tenant_id and company_id
 */
export function buildTenantFilter(tenantId: string): string {
  return `tenant_id.eq.${tenantId},company_id.eq.${tenantId}`;
}
