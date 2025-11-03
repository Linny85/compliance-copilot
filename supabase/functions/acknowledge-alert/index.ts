import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { logEvent } from "../_shared/audit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { alert_id, action, mute_hours } = await req.json();

    if (!alert_id || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get user's company
    const { data: profile } = await sb
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Check admin role
    const { data: roles } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", profile.company_id)
      .in("role", ["admin", "master_admin"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "FORBIDDEN_ADMIN_ONLY" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Get alert to verify tenant ownership
    const { data: alert, error: alertErr } = await sb
      .from("alert_history" as any)
      .select("*")
      .eq("id", alert_id)
      .maybeSingle();

    if (alertErr || !alert) {
      return new Response(JSON.stringify({ error: "Alert not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (alert.tenant_id !== profile.company_id) {
      return new Response(JSON.stringify({ error: "FORBIDDEN" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    let updateData: any = {};

    if (action === "acknowledge") {
      updateData = {
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      };
    } else if (action === "mute") {
      const hours = mute_hours || 24;
      const muteUntil = new Date();
      muteUntil.setHours(muteUntil.getHours() + hours);
      updateData = {
        muted_until: muteUntil.toISOString(),
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      };
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { error: updateErr } = await sb
      .from("alert_history" as any)
      .update(updateData)
      .eq("id", alert_id);

    if (updateErr) throw updateErr;

    // Audit log
    await logEvent(sb, {
      tenant_id: profile.company_id,
      actor_id: user.id,
      action: action === "acknowledge" ? "alert.acknowledge" : "alert.mute",
      entity: "alert",
      entity_id: alert_id,
      payload: {
        alert_type: alert.alert_type,
        severity: alert.severity,
        mute_hours: action === "mute" ? mute_hours : undefined,
      },
    });

    console.log("[acknowledge-alert] Success =>", {
      alert_id,
      action,
      user_id: user.id,
      tenant_id: profile.company_id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: true, action, alert_id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[acknowledge-alert] Error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
