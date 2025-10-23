import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { tenant_id } = await req.json().catch(() => ({}));
    const sb = createClient(URL, SERVICE);

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: cors,
      });
    }

    // Get forecast
    const { data: forecast } = await sb
      .from("v_forecast_predictions" as any)
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (!forecast) {
      return new Response(
        JSON.stringify({ ok: true, note: "no forecast available" }),
        { headers: cors }
      );
    }

    // Get ops metrics
    const { data: ops } = await sb
      .from("ops_dashboard")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    // Get recent alerts
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: alerts } = await sb
      .from("alert_history" as any)
      .select("severity, alert_type, triggered_at, title")
      .eq("tenant_id", tenant_id)
      .gte("triggered_at", since)
      .order("triggered_at", { ascending: false })
      .limit(5);

    // Get admin emails
    const { data: admins } = await sb
      .from("profiles")
      .select("email, user_roles!inner(role)")
      .eq("company_id", tenant_id)
      .in("user_roles.role", ["admin", "master_admin"]);

    const to = (admins ?? []).map((a) => a.email).filter(Boolean);
    if (to.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, note: "no admins" }),
        { headers: cors }
      );
    }

    const riskEmoji =
      forecast.risk_level === "high"
        ? "🔴"
        : forecast.risk_level === "medium"
        ? "🟡"
        : "🟢";

    const subject = `Compliance Forecast: ${forecast.risk_level.toUpperCase()} Risk – ${forecast.breach_probability_7d}% Breach Probability`;

    const advisoryList = (forecast.advisories ?? [])
      .map((a: string) => `<li>${a}</li>`)
      .join("");

    const alertsList =
      (alerts ?? []).length > 0
        ? (alerts ?? [])
            .map(
              (a) =>
                `<li><strong>${a.severity.toUpperCase()}</strong> – ${a.title} (${new Date(a.triggered_at).toLocaleString()})</li>`
            )
            .join("")
        : "<li>No recent alerts</li>";

    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;">
        <h2>Weekly Compliance Forecast</h2>
        
        <div style="padding:16px;border:2px solid #ccc;border-radius:8px;margin:16px 0;">
          <h3>${riskEmoji} ${forecast.risk_level.toUpperCase()} Risk</h3>
          <p><strong>7-Day Breach Probability:</strong> ${forecast.breach_probability_7d}%</p>
          <p><strong>Predicted Success Rate:</strong> ${forecast.predicted_sr_7d}%</p>
          <p><strong>Confidence:</strong> ${forecast.confidence_score}%</p>
          <p><strong>Current SLO Target:</strong> ${forecast.current_slo_target}%</p>
          ${
            forecast.suggested_slo_target !== forecast.current_slo_target
              ? `<p><strong>Suggested SLO Target:</strong> ${forecast.suggested_slo_target}% (${
                  forecast.suggested_slo_target > forecast.current_slo_target
                    ? "+"
                    : ""
                }${(forecast.suggested_slo_target - forecast.current_slo_target).toFixed(1)}%)</p>`
              : ""
          }
        </div>

        <h3>Recommended Actions</h3>
        <ul>${advisoryList}</ul>

        <h3>Current Status</h3>
        <p><strong>Success Rate (30d):</strong> ${ops?.success_rate_30d ?? "N/A"}%</p>
        <p><strong>Open Alerts:</strong> 🔴 ${ops?.open_critical ?? 0} | 🟡 ${ops?.open_warning ?? 0}</p>
        <p><strong>Error Budget Burn-Rate:</strong> ${(ops?.burn_24h_x ?? 0).toFixed(1)}× (${ops?.burn_status ?? "unknown"})</p>

        <h3>Recent Alerts (Last 7 Days)</h3>
        <ul>${alertsList}</ul>

        <p style="margin-top:24px;font-size:12px;color:#666;">
          View full details in the Admin dashboard → Compliance → Forecast.
        </p>
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

    // Send webhook notification
    const { data: settings } = await sb
      .from("tenant_settings")
      .select("notification_webhook_url, webhook_domain_allowlist, webhook_secret")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    let webhookSent = false;
    if (settings?.notification_webhook_url) {
      try {
        const allow = (settings.webhook_domain_allowlist ?? []) as string[];
        const url = new globalThis.URL(settings.notification_webhook_url);

        if (!url.protocol.startsWith("https")) {
          console.warn("[send-forecast-digest] Webhook rejected: non-HTTPS");
        } else if (allow.length > 0 && !allow.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
          console.warn("[send-forecast-digest] Webhook rejected: not in allowlist");
        } else {
          const payload = {
            event: "compliance_forecast",
            data: {
              risk_level: forecast.risk_level,
              breach_probability: forecast.breach_probability_7d,
              predicted_sr: forecast.predicted_sr_7d,
              confidence: forecast.confidence_score,
              advisories: forecast.advisories,
              current_target: forecast.current_slo_target,
              suggested_target: forecast.suggested_slo_target,
            },
            timestamp: new Date().toISOString(),
          };

          const bodyStr = JSON.stringify(payload);
          const key = settings.webhook_secret ?? "";
          const sig = await hmacSHA256(bodyStr, key);

          const webhookRes = await fetch(settings.notification_webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Signature": sig,
              "X-Signature-Version": "v1",
              "X-Event-Type": "compliance_forecast",
            },
            body: bodyStr,
          });

          webhookSent = webhookRes.ok;
          if (!webhookRes.ok) {
            console.error("[send-forecast-digest] Webhook failed:", webhookRes.status);
          }
        }
      } catch (e) {
        console.error("[send-forecast-digest] Webhook error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: res.ok,
        email_sent: res.ok,
        webhook_sent: webhookSent,
        recipients: to.length,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[send-forecast-digest] error:", e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});

async function hmacSHA256(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
