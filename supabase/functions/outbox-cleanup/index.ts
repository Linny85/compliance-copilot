import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Server-only
    const sb = createClient(url, service);

    const retentionDays = Number(Deno.env.get("OUTBOX_RETENTION_DAYS") ?? "30");
    const batchLimit = Number(Deno.env.get("OUTBOX_CLEANUP_BATCH") ?? "5000");

    const { data, error } = await sb.rpc("outbox_cleanup", {
      p_retention_days: retentionDays,
      p_batch_limit: batchLimit
    });

    if (error) throw error;

    // 🔔 Slack-Notify, wenn etwas verschoben wurde
    const moved = Number(data?.moved ?? 0);
    if (moved > 0) {
      const token = Deno.env.get("INTEGRATIONS_SLACK_BOT_TOKEN");
      const channel = Deno.env.get("CLEANUP_ALERT_CHANNEL") || Deno.env.get("INTEGRATIONS_SLACK_CHANNEL_DEFAULT");
      if (token && channel) {
        const text = `Outbox-Cleanup: *${moved}* moved, *${Number(data?.deleted ?? 0)}* deleted (cutoff=${data?.cutoff}, retention=${retentionDays}d, batch=${batchLimit}).`;
        const res = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: { "Content-Type":"application/json; charset=utf-8", "Authorization":`Bearer ${token}` },
          body: JSON.stringify({ channel, text, unfurl_links:false, unfurl_media:false })
        });
        // Optional: Fehler ignorieren, nur loggen
        if (!res.ok) console.warn("[outbox-cleanup] Slack notify failed", await res.text().catch(()=>""));
      }
    }

    return json({ ok: true, retentionDays, batchLimit, result: data });
  } catch (e: any) {
    console.error("[outbox-cleanup]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" }});
}
