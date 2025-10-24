import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    const days = Number(Deno.env.get("OUTBOX_ARCHIVE_PRUNE_DAYS") ?? "180");
    const { data, error } = await sb.rpc("outbox_archive_prune", { p_days: days });
    if (error) throw error;

    return new Response(JSON.stringify({ ok:true, deleted: Number(data), days }), {
      headers: { ...corsHeaders, "Content-Type":"application/json" }
    });
  } catch (e:any) {
    console.error("[outbox-archive-prune]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type":"application/json" }
    });
  }
});
