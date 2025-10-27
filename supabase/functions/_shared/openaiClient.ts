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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Try 1: tenant_settings
  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('openai_api_key')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!error && data?.openai_api_key) return data.openai_api_key;
  } catch {}

  // Try 2: tenants
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('openai_api_key')
      .eq('id', tenantId)
      .maybeSingle();
    if (!error && data?.openai_api_key) return data.openai_api_key;
  } catch {}

  // Try 3: unternehmen
  try {
    const { data, error } = await supabase
      .from('unternehmen')
      .select('openai_api_key')
      .eq('id', tenantId)
      .maybeSingle();
    if (!error && data?.openai_api_key) return data.openai_api_key;
  } catch {
    // Try 4: "Unternehmen" (quoted)
    try {
      const { data, error } = await supabase
        .from('Unternehmen')
        .select('openai_api_key')
        .eq('id', tenantId)
        .maybeSingle();
      if (!error && data?.openai_api_key) return data.openai_api_key;
    } catch {}
  }

  // Fallback to global key
  return globalKey;
}
