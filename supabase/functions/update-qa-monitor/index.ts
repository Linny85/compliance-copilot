// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const sb = createClient(URL, SERVICE_KEY);
  try {
    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("Missing tenant_id");

    // Get latest QA result
    const { data: qa } = await sb.from("qa_results")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get notification deliveries from last 24h
    const since = new Date(Date.now() - 24*60*60*1000).toISOString();
    const { data: deliveries } = await sb
      .from("notification_deliveries")
      .select("status_code, duration_ms")
      .eq("tenant_id", tenant_id)
      .gte("created_at", since);

    const validDurations = (deliveries || [])
      .map(d => d.duration_ms)
      .filter((d): d is number => d !== null && d !== undefined);
    
    const avgLatency = validDurations.length > 0 
      ? validDurations.reduce((a, d) => a + d, 0) / validDurations.length 
      : 0;

    const failed = (deliveries || []).filter(d => (d.status_code ?? 0) >= 400).length;

    // Upsert monitor data
    await sb.from("qa_monitor")
      .upsert({
        tenant_id,
        last_run_id: qa?.id ?? null,
        last_run_status: `${qa?.passed ?? 0}/${qa?.total ?? 0}`,
        last_run_at: qa?.started_at ?? new Date().toISOString(),
        avg_latency_ms: Math.round(avgLatency),
        failed_24h: failed,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id" });

    return new Response(JSON.stringify({ 
      ok: true, 
      stats: { avgLatency, failed, qaStatus: `${qa?.passed ?? 0}/${qa?.total ?? 0}` }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[update-qa-monitor] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
