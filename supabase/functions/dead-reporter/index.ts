// Daily dead jobs reporter → posts a Slack summary per tenant
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    const LOOKBACK_HOURS = Number(Deno.env.get("DEAD_ALERT_LOOKBACK_HOURS") ?? "24");
    const THRESHOLD = Number(Deno.env.get("DEAD_ALERT_THRESHOLD") ?? "5");
    const SLACK_TOKEN = Deno.env.get("INTEGRATIONS_SLACK_BOT_TOKEN")!;
    const SLACK_CHANNEL = Deno.env.get("DEAD_ALERT_CHANNEL") || Deno.env.get("INTEGRATIONS_SLACK_CHANNEL_DEFAULT")!;
    if (!SLACK_TOKEN || !SLACK_CHANNEL) {
      return json({ error: "Slack config missing" }, 500);
    }

    // Aggregate dead jobs in lookback window
    const sinceIso = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();

    // Per-tenant counts
    const { data: byTenant, error: aggErr } = await sb.rpc("deadjobs_by_tenant", { since_ts: sinceIso });
    if (aggErr) throw aggErr;

    // Top errors (global) for context
    const { data: topErrors, error: errAgg } = await sb.rpc("deadjobs_top_errors", { since_ts: sinceIso, top_n: 5 });
    if (errAgg) throw errAgg;

    const totalDead = (byTenant ?? []).reduce((a: number, r: any) => a + Number(r.cnt || 0), 0);

    // Only alert if over threshold
    if (totalDead < THRESHOLD) {
      return json({ ok: true, skipped: true, totalDead, threshold: THRESHOLD });
    }

    const lines: string[] = [];
    lines.push(`*Dead Jobs Report* (letzte ${LOOKBACK_HOURS}h)`);
    lines.push(`• Gesamt: *${totalDead}* (Schwelle: ${THRESHOLD})`);
    if (byTenant?.length) {
      lines.push(`• Pro Tenant:`);
      for (const r of byTenant) {
        lines.push(`  – ${r.tenant_id}: *${r.cnt}*`);
      }
    }
    if (topErrors?.length) {
      lines.push(`• Top-Fehler:`);
      for (const e of topErrors) {
        lines.push(`  – ${String(e.err || "").slice(0, 120)} (${e.cnt}×)`);
      }
    }

    const text = lines.join("\n");

    // Post to Slack
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${SLACK_TOKEN}` },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text, unfurl_links: false, unfurl_media: false }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      const msg = `Slack error: ${body?.error ?? res.status}`;
      console.error(msg);
      return json({ error: msg }, 502);
    }

    return json({ ok: true, totalDead, alerted: true });
  } catch (e: any) {
    console.error("[dead-reporter]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
