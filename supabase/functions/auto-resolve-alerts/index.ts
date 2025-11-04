import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find alerts eligible for auto-resolution
    const { data: clearable, error: clearErr } = await sb
      .from("v_alert_clearance" as any)
      .select("*");

    if (clearErr) throw clearErr;

    const resolved: string[] = [];
    const now = new Date().toISOString();

    for (const alert of clearable ?? []) {
      // Set resolved_at and resolution_reason
      const { error: updateErr } = await sb
        .from("alert_history")
        .update({
          resolved_at: now,
          resolution_reason: "auto",
        })
        .eq("id", alert.alert_id);

      if (updateErr) {
        console.error(`[auto-resolve] failed to resolve ${alert.alert_id}:`, updateErr);
        continue;
      }

      // Log audit event
      await sb.from("audit_log").insert({
        tenant_id: alert.tenant_id,
        actor_id: "00000000-0000-0000-0000-000000000000", // system
        action: "alert.auto_resolved",
        entity: "alert",
        entity_id: alert.alert_id,
        payload: {
          alert_type: alert.alert_type,
          severity: alert.severity,
          triggered_at: alert.triggered_at,
          resolved_at: now,
          current_sr: alert.current_sr,
          current_burn: alert.current_burn,
        },
      });

      resolved.push(alert.alert_id);
    }

    console.log("[auto-resolve-alerts]", {
      ts: now,
      scanned: (clearable ?? []).length,
      resolved: resolved.length,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: (clearable ?? []).length,
        resolved: resolved.length,
        alert_ids: resolved,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[auto-resolve-alerts] error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
