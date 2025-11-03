import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Alert = {
  tenant_id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
  rule_code?: string;
  metadata: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get all tenants with compliance data
    const { data: companies, error: compError } = await sb
      .from("profiles")
      .select("company_id")
      .not("company_id", "is", null);

    if (compError) throw compError;

    const tenantIds = Array.from(
      new Set((companies ?? []).map((c: any) => c.company_id).filter(Boolean))
    );

    const alertsCreated: Record<string, Alert[]> = {};

    for (const tenantId of tenantIds) {
      const alerts: Alert[] = [];

      // Check SLO breaches
      const { data: slo } = await sb
        .from("v_compliance_slo_30d" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (slo) {
        // Critical breach: SR < 70%
        if (slo.slo_critical_breach) {
          const shouldCreate = await sb.rpc("should_create_alert", {
            _tenant_id: tenantId,
            _alert_type: "slo_breach",
            _metric_name: "success_rate",
            _cooldown_minutes: 60,
          });

          if (shouldCreate.data) {
            alerts.push({
              tenant_id: tenantId,
              alert_type: "slo_breach",
              severity: "critical",
              title: "Critical: Compliance Success Rate Below 70%",
              description: `Success rate has dropped to ${slo.success_rate}%, below the critical threshold of 70%. Immediate action required.`,
              metric_name: "success_rate",
              metric_value: slo.success_rate,
              threshold_value: 70,
              metadata: {
                total: slo.total,
                passed: slo.passed,
                wow_delta: slo.wow_delta,
              },
            });
          }
        }
        // Warning breach: SR 70-80%
        else if (slo.slo_warning_breach) {
          const shouldCreate = await sb.rpc("should_create_alert", {
            _tenant_id: tenantId,
            _alert_type: "slo_breach",
            _metric_name: "success_rate",
            _cooldown_minutes: 120,
          });

          if (shouldCreate.data) {
            alerts.push({
              tenant_id: tenantId,
              alert_type: "slo_breach",
              severity: "warning",
              title: "Warning: Compliance Success Rate Below Target",
              description: `Success rate is ${slo.success_rate}%, below the target of 80%. Monitor closely.`,
              metric_name: "success_rate",
              metric_value: slo.success_rate,
              threshold_value: 80,
              metadata: {
                total: slo.total,
                passed: slo.passed,
                wow_delta: slo.wow_delta,
              },
            });
          }
        }

        // WoW degradation
        if (slo.wow_degradation) {
          const shouldCreate = await sb.rpc("should_create_alert", {
            _tenant_id: tenantId,
            _alert_type: "slo_breach",
            _metric_name: "wow_delta",
            _cooldown_minutes: 120,
          });

          if (shouldCreate.data) {
            alerts.push({
              tenant_id: tenantId,
              alert_type: "slo_breach",
              severity: "warning",
              title: "Warning: Week-over-Week Degradation",
              description: `Success rate decreased by ${Math.abs(slo.wow_delta)}% compared to last week.`,
              metric_name: "wow_delta",
              metric_value: slo.wow_delta,
              threshold_value: -5,
              metadata: {
                success_rate: slo.success_rate,
                total: slo.total,
              },
            });
          }
        }
      }

      // Check anomalies
      const { data: anomaly } = await sb
        .from("v_anomalies_7d" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (anomaly) {
        // Success rate anomaly
        if (anomaly.is_success_rate_anomaly) {
          const shouldCreate = await sb.rpc("should_create_alert", {
            _tenant_id: tenantId,
            _alert_type: "anomaly",
            _metric_name: "success_rate",
            _cooldown_minutes: 180,
          });

          if (shouldCreate.data) {
            alerts.push({
              tenant_id: tenantId,
              alert_type: "anomaly",
              severity: "warning",
              title: "Anomaly: Unusual Success Rate Pattern",
              description: `Success rate of ${anomaly.current_success_rate?.toFixed(1)}% deviates significantly from the 7-day average of ${anomaly.avg_success_rate?.toFixed(1)}% (z-score: ${anomaly.success_rate_zscore?.toFixed(2)}).`,
              metric_name: "success_rate",
              metric_value: anomaly.current_success_rate ?? 0,
              threshold_value: anomaly.avg_success_rate ?? 0,
              metadata: {
                zscore: anomaly.success_rate_zscore,
                stddev: anomaly.stddev_success_rate,
              },
            });
          }
        }

        // Failure spike
        if (anomaly.is_failure_spike) {
          const shouldCreate = await sb.rpc("should_create_alert", {
            _tenant_id: tenantId,
            _alert_type: "failure_spike",
            _metric_name: "failure_count",
            _cooldown_minutes: 60,
          });

          if (shouldCreate.data) {
            alerts.push({
              tenant_id: tenantId,
              alert_type: "failure_spike",
              severity: "critical",
              title: "Critical: Failure Spike Detected",
              description: `Current failures (${anomaly.current_failures}) exceed the 95th percentile (${anomaly.p95_failures?.toFixed(0)}) by 50%+.`,
              metric_name: "failure_count",
              metric_value: anomaly.current_failures ?? 0,
              threshold_value: anomaly.p95_failures ?? 0,
              metadata: {
                p95: anomaly.p95_failures,
                current: anomaly.current_failures,
              },
            });
          }
        }
      }

      // Check burn-rate
      const { data: burn } = await sb
        .from("v_slo_burn_7d" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (burn) {
        // Excessive burn-rate (>= 3x)
        if (burn.burn_24h_x >= 3.0) {
          const shouldCreate = await sb.rpc("should_create_alert", {
            _tenant_id: tenantId,
            _alert_type: "burn_rate",
            _metric_name: "burn_24h",
            _cooldown_minutes: 60,
          });

          if (shouldCreate.data) {
            alerts.push({
              tenant_id: tenantId,
              alert_type: "burn_rate",
              severity: "critical",
              title: `Critical: Error Budget Burning at ${burn.burn_24h_x.toFixed(1)}×`,
              description: `Consuming error budget at ${burn.burn_24h_x.toFixed(1)}× normal rate. SLO breach imminent if not addressed.`,
              metric_name: "burn_24h",
              metric_value: burn.burn_24h_x,
              threshold_value: 3.0,
              metadata: {
                burn_24h: burn.burn_24h_x,
                burn_7d: burn.burn_7d_x,
                status: burn.burn_status,
                target_sr: burn.target_sr,
              },
            });
          }
        }
        // Elevated burn-rate (>= 2x)
        else if (burn.burn_24h_x >= 2.0) {
          const shouldCreate = await sb.rpc("should_create_alert", {
            _tenant_id: tenantId,
            _alert_type: "burn_rate",
            _metric_name: "burn_24h",
            _cooldown_minutes: 120,
          });

          if (shouldCreate.data) {
            alerts.push({
              tenant_id: tenantId,
              alert_type: "burn_rate",
              severity: "warning",
              title: `Warning: Elevated Error Budget Burn-Rate ${burn.burn_24h_x.toFixed(1)}×`,
              description: `Error budget consumption is ${burn.burn_24h_x.toFixed(1)}× normal rate. Monitor closely to prevent SLO breach.`,
              metric_name: "burn_24h",
              metric_value: burn.burn_24h_x,
              threshold_value: 2.0,
              metadata: {
                burn_24h: burn.burn_24h_x,
                burn_7d: burn.burn_7d_x,
                status: burn.burn_status,
                target_sr: burn.target_sr,
              },
            });
          }
        }
      }

      // Persist alerts
      if (alerts.length > 0) {
        const { error: insertErr } = await sb.from("alert_history").insert(alerts);
        if (insertErr) {
          console.error(`[alert-agent] Failed to insert alerts for ${tenantId}:`, insertErr);
        } else {
          alertsCreated[tenantId] = alerts;

          // Send webhook notifications
          const { data: settings } = await sb
            .from("tenant_settings")
            .select("notification_webhook_url, webhook_domain_allowlist, webhook_secret")
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (settings?.notification_webhook_url) {
            for (const alert of alerts) {
              try {
                const allow = (settings.webhook_domain_allowlist ?? []) as string[];
                const url = new URL(settings.notification_webhook_url);

                if (!url.protocol.startsWith("https")) continue;
                if (allow.length > 0 && !allow.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`))) continue;

                const payload = {
                  event: "compliance_alert",
                  data: alert,
                  timestamp: new Date().toISOString(),
                };
                const bodyStr = JSON.stringify(payload);
                const key = settings.webhook_secret ?? "";
                const sig = await hmacSHA256(bodyStr, key);

                const res = await fetch(settings.notification_webhook_url, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Signature": sig,
                    "X-Signature-Version": "v1",
                    "X-Event-Type": "compliance_alert",
                  },
                  body: bodyStr,
                });

                if (!res.ok) {
                  console.error(`[alert-agent] Webhook failed for ${tenantId}:`, res.status);
                }
              } catch (e) {
                console.error(`[alert-agent] Webhook error for ${tenantId}:`, e);
              }
            }
          }
        }
      }

      // Log metrics
      console.log("[compliance-alert-agent] Scan complete =>", {
        tenant_id: tenantId,
        alerts_created: alerts.length,
        severity_breakdown: {
          critical: alerts.filter(a => a.severity === "critical").length,
          warning: alerts.filter(a => a.severity === "warning").length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tenants_scanned: tenantIds.length,
        total_alerts: Object.values(alertsCreated).flat().length,
        alerts_by_tenant: Object.fromEntries(
          Object.entries(alertsCreated).map(([tid, alerts]) => [tid, alerts.length])
        ),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("[compliance-alert-agent] Error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
