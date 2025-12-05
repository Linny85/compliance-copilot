import { supabaseAdmin } from "./security.ts";

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
