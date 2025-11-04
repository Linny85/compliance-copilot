import { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogParams {
  tenant_id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  payload?: Record<string, unknown>;
  ip?: string;
  user_agent?: string;
}

/**
 * Extract first valid IP address from comma-separated list
 * X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
 * We want the client IP (first one)
 */
function extractFirstIp(ipHeader: string | null | undefined): string | undefined {
  if (!ipHeader) return undefined;
  
  // Split by comma and take first non-empty value
  const firstIp = ipHeader.split(',')[0].trim();
  
  // Basic validation: should look like an IP address
  if (firstIp && /^[\d\.:a-f]+$/i.test(firstIp)) {
    return firstIp;
  }
  
  return undefined;
}

/**
 * Logs an audit event to the audit_log table with automatic hash chaining
 * Fire-and-forget: errors are logged but don't block the main flow
 * 
 * IMPORTANT: Hash chain (prev_hash, event_hash) is computed automatically by DB trigger
 */
export async function logEvent(
  supabase: SupabaseClient,
  params: AuditLogParams
): Promise<void> {
  try {
    // Extract first IP if multiple are provided
    const cleanIp = extractFirstIp(params.ip);
    
    const { error } = await supabase.from('audit_log').insert({
      tenant_id: params.tenant_id,
      actor_id: params.actor_id,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id,
      payload: params.payload || {},
      ip: cleanIp,
      user_agent: params.user_agent,
    });

    if (error) {
      console.error('[audit] Failed to log event:', error);
    }
  } catch (err) {
    console.error('[audit] Exception while logging:', err);
  }
}
