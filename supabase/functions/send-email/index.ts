// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

type EmailPayload = {
  tenant_id: string;
  to: string | string[];
  subject: string;
  html: string;
};

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
    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY secret");

    const { tenant_id, to, subject, html } = await req.json() as EmailPayload;
    if (!tenant_id || !subject || !html || !to) throw new Error("Missing fields");

    console.log(`[send-email] Sending email to ${to} for tenant ${tenant_id}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@compliance-copilot.app",
        to,
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log(`[send-email] Resend response: ${res.status}`, data);

    await sb.from("notification_deliveries").insert({
      tenant_id,
      run_id: null,
      channel: "email",
      status_code: res.status,
      attempts: 1,
      duration_ms: null,
      error_excerpt: res.ok ? null : JSON.stringify(data).slice(0, 300),
    });

    return new Response(JSON.stringify({ ok: res.ok, data }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-email] Error:", e);
    await sb.from("notification_deliveries").insert({
      tenant_id: null,
      run_id: null,
      channel: "email",
      status_code: 500,
      attempts: 1,
      duration_ms: null,
      error_excerpt: String(e.message || e).slice(0, 300),
    });
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
