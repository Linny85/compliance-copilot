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

    return json({ ok: true, retentionDays, batchLimit, result: data });
  } catch (e: any) {
    console.error("[outbox-cleanup]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" }});
}
