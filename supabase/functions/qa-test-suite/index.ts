// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Authenticate with user token
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(URL, ANON_KEY, { global: { headers: { Authorization: auth }}});

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get tenant from profile
    const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No tenant" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const tenant_id = profile.company_id;

    // Verify admin role
    const { data: roles } = await sb.from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", tenant_id)
      .in("role", ["admin","master_admin"]);
    
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "FORBIDDEN_ADMIN_ONLY" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use service client for inserts
    const sbSrv = createClient(URL, SERVICE_KEY);

    console.log(`[qa-test-suite] Starting QA suite for tenant ${tenant_id}`);

    // Create QA result entry
    const { data: qaRow, error: qaErr } = await sbSrv.from("qa_results").insert({
      tenant_id, 
      suite: "resend-webhook-queue", 
      total: 3, 
      passed: 0, 
      failed: 0, 
      created_by: user.id
    }).select("*").single();
    
    if (qaErr) throw qaErr;

    // Create 3 synthetic events in queue
    const now = new Date().toISOString();
    const batch = [
      { tenant_id, run_id: crypto.randomUUID(), status: "success", rule_code: "QA_OK", started_at: now, finished_at: now },
      { tenant_id, run_id: crypto.randomUUID(), status: "failed",  rule_code: "QA_FAIL", started_at: now, finished_at: now },
      { tenant_id, run_id: crypto.randomUUID(), status: "partial", rule_code: "QA_PART", started_at: now, finished_at: now },
    ];
    
    const { error: qErr } = await sbSrv.from("run_events_queue").insert(batch);
    if (qErr) throw qErr;

    // Update QA result as started
    await sbSrv.from("qa_results")
      .update({ notes: "Dispatched 3 events to queue", started_at: now })
      .eq("id", qaRow.id);

    console.log(`[qa-test-suite] Created QA run ${qaRow.id} with 3 events`);

    return new Response(JSON.stringify({ 
      ok: true, 
      qa_id: qaRow.id, 
      enqueued: batch.map(b => b.run_id) 
    }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("[qa-test-suite] Error:", e);
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
