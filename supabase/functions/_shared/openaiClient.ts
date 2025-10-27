import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Retrieves the OpenAI API key for a tenant.
 * 
 * Priority:
 * 1. Tenant-specific key (if FEATURE_TENANT_OPENAI_KEYS=true and tenant_id provided)
 * 2. Global OPENAI_API_KEY (fallback)
 * 
 * @param tenantId - Optional tenant ID
 * @returns OpenAI API key or null if none configured
 */
export async function getTenantOpenAIKey(tenantId?: string): Promise<string | null> {
  const feature = (Deno.env.get('FEATURE_TENANT_OPENAI_KEYS') ?? 'false') === 'true';
  const globalKey = Deno.env.get('OPENAI_API_KEY') ?? null;

  // Feature disabled or no tenant ID → use global key
  if (!feature || !tenantId) {
    return globalKey;
  }

  try {
    // Use service role to access tenant settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('tenants')
      .select('openai_api_key')
      .eq('id', tenantId)
      .single();

    if (error) {
      console.error('[getTenantOpenAIKey] lookup failed for tenant', tenantId, '(using global fallback)');
      return globalKey; // Guaranteed fallback
    }

    // Return tenant key if exists, otherwise global key
    return data?.openai_api_key || globalKey;
  } catch (e) {
    console.error('[getTenantOpenAIKey] exception', String(e), '(using global fallback)');
    return globalKey;
  }
}
