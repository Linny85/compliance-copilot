import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

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
    const { error } = await supabase.from('audit_log').insert({
      tenant_id: params.tenant_id,
      actor_id: params.actor_id,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id,
      payload: params.payload || {},
      ip: params.ip,
      user_agent: params.user_agent,
    });

    if (error) {
      console.error('[audit] Failed to log event:', error);
    }
  } catch (err) {
    console.error('[audit] Exception while logging:', err);
  }
}
