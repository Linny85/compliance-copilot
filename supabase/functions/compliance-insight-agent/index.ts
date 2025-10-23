import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Insight = {
  tenant_id: string;
  period_start: string;
  period_end: string;
  success_rate: number;
  wow_delta: number;
  top_failures: Array<{ rule_code: string; failures: number }>;
  improvements: Array<{ rule_code: string; delta: number }>;
  qa_failed_24h: number;
  summary: Record<string, unknown>;
  executive_note?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization") || "";
  const isService = auth.includes(SERVICE_KEY);

  try {
    const sb = createClient(SUPABASE_URL, isService ? SERVICE_KEY : ANON_KEY, {
      global: { headers: isService ? {} : { Authorization: auth } },
    });

    const body = await req.json().catch(() => ({}));
    const { tenant_id, generate_note } = body ?? {};

    let tenantIds: string[] = [];

    if (tenant_id) {
      tenantIds = [tenant_id];
    } else if (isService) {
      // Batch for all tenants
      const { data: companies, error } = await sb
        .from("profiles")
        .select("company_id")
        .not("company_id", "is", null);
      if (error) throw error;
      tenantIds = Array.from(
        new Set((companies ?? []).map((c: any) => c.company_id).filter(Boolean))
      );
    } else {
      // Resolve tenant from current user + admin gate
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const { data: profile } = await sb
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        return new Response(JSON.stringify({ error: "No tenant" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

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

      tenantIds = [profile.company_id];
    }

    const sbSrv = createClient(SUPABASE_URL, SERVICE_KEY);
    const results: Record<string, any> = {};

    for (const tid of tenantIds) {
      // Get 30-day summary
      const { data: trend } = await sbSrv
        .from("v_compliance_trends_30d")
        .select("*")
        .eq("tenant_id", tid)
        .maybeSingle();

      const period_start =
        trend?.period_start ??
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const period_end = trend?.period_end ?? new Date().toISOString().slice(0, 10);
      const success_rate = Number(trend?.success_rate ?? 0);
      const wow_delta = Number(trend?.wow_delta ?? 0);

      // Get top failures
      const { data: topFailRows } = await sbSrv
        .from("v_top_failures_30d")
        .select("rule_code, failures")
        .eq("tenant_id", tid)
        .order("failures", { ascending: false })
        .limit(5);

      const top_failures = (topFailRows ?? []) as Array<{
        rule_code: string;
        failures: number;
      }>;

      // Get improvements
      const { data: improveRows } = await sbSrv
        .from("v_improvements_14d")
        .select("rule_code, delta")
        .eq("tenant_id", tid)
        .order("delta", { ascending: false })
        .limit(5);

      const improvements = (improveRows ?? []) as Array<{
        rule_code: string;
        delta: number;
      }>;

      // Get QA failures (24h)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: qa_failed_24h } = await sbSrv
        .from("notification_deliveries")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tid)
        .gte("created_at", since)
        .gte("status_code", 400);

      // Generate executive note
      let executive_note = undefined as string | undefined;
      if (generate_note) {
        const riskBadge =
          success_rate >= 80 ? "Healthy" : success_rate >= 60 ? "Watch" : "At Risk";
        const top1 = top_failures?.[0]?.rule_code ?? "—";
        executive_note =
          `Status: ${riskBadge}. Success Rate: ${success_rate}% (WoW ${wow_delta >= 0 ? "+" : ""}${wow_delta}%). ` +
          `Most frequent failures: ${top1}. ` +
          (qa_failed_24h && qa_failed_24h > 0
            ? `Note: ${qa_failed_24h} delivery failures in last 24h. `
            : `Notifications stable. `) +
          `Focus: Prioritize top failures and maintain improved controls.`;
      }

      const insight: Insight = {
        tenant_id: tid,
        period_start: String(period_start),
        period_end: String(period_end),
        success_rate,
        wow_delta,
        top_failures: top_failures ?? [],
        improvements: improvements ?? [],
        qa_failed_24h: qa_failed_24h ?? 0,
        summary: {
          total_30d: trend?.total ?? 0,
          passed_30d: trend?.passed ?? 0,
          failed_30d: trend?.failed ?? 0,
        },
        executive_note,
      };

      // Persist insight
      const { error: insErr } = await sbSrv.from("insight_history").insert({
        tenant_id: insight.tenant_id,
        period_start: insight.period_start,
        period_end: insight.period_end,
        success_rate: insight.success_rate,
        wow_delta: insight.wow_delta,
        top_failures: insight.top_failures,
        improvements: insight.improvements,
        qa_failed_24h: insight.qa_failed_24h,
        summary: insight.summary,
        executive_note: insight.executive_note ?? null,
      });

      if (insErr) throw insErr;

      // Optional webhook notification
      const { data: settings } = await sbSrv
        .from("tenant_settings")
        .select("notification_webhook_url, webhook_domain_allowlist, webhook_secret")
        .eq("tenant_id", tid)
        .maybeSingle();

      if (settings?.notification_webhook_url) {
        try {
          const allow = (settings.webhook_domain_allowlist ?? []) as string[];
          const url = new URL(settings.notification_webhook_url);
          
          if (!url.protocol.startsWith("https")) {
            throw new Error("Webhook must use HTTPS");
          }
          
          if (allow.length > 0 && !allow.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
            throw new Error("Webhook domain not in allowlist");
          }

          const payload = {
            event: "compliance_insight_generated",
            data: insight,
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
              "X-Event-Type": "compliance_insight_generated",
            },
            body: bodyStr,
          });

          if (!res.ok) {
            console.error("[insight-agent] Webhook failed:", res.status);
          }
        } catch (e) {
          console.error("[insight-agent] Webhook error:", e);
        }
      }

      // Log metrics
      console.log("[compliance-insight-agent] Metrics =>", {
        tenant_id: tid,
        passed: insight.summary.passed_30d ?? 0,
        failed: insight.summary.failed_30d ?? 0,
        warnings: 0,
        qa_failed: insight.qa_failed_24h,
        success_rate: insight.success_rate,
        wow_delta: insight.wow_delta,
        timestamp: new Date().toISOString(),
      });

      results[tid] = {
        ok: true,
        success_rate,
        wow_delta,
        top_failures: insight.top_failures.length,
      };
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[compliance-insight-agent] Error:", e);
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
