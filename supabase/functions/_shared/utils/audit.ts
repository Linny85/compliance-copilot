// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const supabaseAdmin = createClient(URL, KEY);

/** Einheitliche Audit-API (typsicher & fehlertolerant) */
export type AuditEvent =
  | "master.set"
  | "master.verify.ok"
  | "master.verify.fail"
  | "org.update";

export async function auditEvent(params: {
  tenantId: string;
  userId: string;
  event: AuditEvent;
  details?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("org_audit").insert({
      tenant_id: params.tenantId,
      user_id: params.userId,
      event: params.event,
      details: params.details ?? null
    });
  } catch {
    // bewusst still: Audit darf nie User-Flows brechen
  }
}
