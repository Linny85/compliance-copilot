import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_TOKEN = Deno.env.get("INTERNAL_JOB_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Internal job: expects Supabase Scheduler with secret header; not for public browser use.
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const providedSecret = req.headers.get("x-internal-token") ?? "";
  if (!INTERNAL_TOKEN || providedSecret !== INTERNAL_TOKEN) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { tenant_id } = await req.json().catch(() => ({}));
    const sb = createClient(URL, SERVICE);

    if (!tenant_id)
      return json({ error: "tenant_id required" }, 400);

    const { data: ops } = await sb
      .from("ops_dashboard")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await sb
      .from("alert_history" as any)
      .select("severity, alert_type, triggered_at, title")
      .eq("tenant_id", tenant_id)
      .gte("triggered_at", since)
      .order("triggered_at", { ascending: false })
      .limit(10);

    const { data: admins } = await sb
      .from("profiles")
      .select("email, user_roles!inner(role)")
      .eq("company_id", tenant_id)
      .in("user_roles.role", ["admin", "master_admin"]);

    const to = (admins ?? []).map((a: any) => a.email).filter(Boolean);
    if (to.length === 0)
      return json({ ok: true, note: "no admins" });

    const light = ops?.traffic_light ?? "green";
    const subject = `Ops Digest – ${light.toUpperCase()} – SR ${ops?.success_rate_30d ?? 0}%`;

    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;">
        <h2>Compliance Ops Digest</h2>
        <p><strong>Traffic Light:</strong> ${light.toUpperCase()}</p>
        <p><strong>Success Rate (30d):</strong> ${ops?.success_rate_30d ?? 0}% (${ops?.wow_delta_30d ?? 0}% WoW)</p>
        <p><strong>Open Alerts:</strong> 🔴 ${ops?.open_critical ?? 0} | 🟡 ${ops?.open_warning ?? 0}</p>
        <p><strong>MTTA:</strong> ${Math.round((ops?.mtta_ms ?? 0) / 1000)}s |
           <strong>MTTR:</strong> ${Math.round((ops?.mttr_ms ?? 0) / 1000)}s</p>
        <h3>Last 24h alerts</h3>
        <ul>
          ${(recent ?? []).map((r: any) => `<li>${new Date(r.triggered_at).toLocaleString()} – ${r.severity.toUpperCase()} – ${r.title}</li>`).join("") || "<li>None</li>"}
        </ul>
        <p>View details in the Admin dashboard → Compliance.</p>
      </div>
    `;

    const res = await fetch(`${URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tenant_id, to, subject, html }),
    });

    return json({ ok: res.ok, to: to.length });
  } catch (e: any) {
    console.error("[send-ops-digest] error:", e);
    return json({ error: e.message || String(e) }, 500);
  }
});
