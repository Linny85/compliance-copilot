// supabase/functions/get-reliability-trend/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const sb = createClient(URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { tenant_id } = await req.json().catch(() => ({}));
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await sb
      .from("v_forecast_reliability_trend")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("day", { ascending: true });

    if (error) throw error;

    console.log("[get-reliability-trend] ok", {
      tenant: tenant_id,
      count: (data ?? []).length,
      ts: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ ok: true, trend: data ?? [] }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[get-reliability-trend] error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
