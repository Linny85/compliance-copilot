// deno-lint-ignore-file no-explicit-any
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";
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

    const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No tenant" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const tenant_id = profile.company_id;

    // Verify admin
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

    const sbSrv = createClient(URL, SERVICE_KEY);

    console.log(`[generate-qa-report] Generating report for tenant ${tenant_id}`);

    // Get latest QA result
    const { data: qa } = await sbSrv
      .from("qa_results")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get 24h stats
    const since = new Date(Date.now() - 24*60*60*1000).toISOString();
    const { data: last24h } = await sbSrv
      .from("notification_deliveries")
      .select("status_code, duration_ms, channel, created_at")
      .eq("tenant_id", tenant_id)
      .gte("created_at", since);

    const sent = (last24h || []).filter(d => (d.status_code ?? 0) < 400).length;
    const failed = (last24h || []).length - sent;
    const durations = (last24h || []).map(d => d.duration_ms).filter(Boolean).sort((a, b) => a - b);
    const medianMs = durations.length ? durations[Math.floor(durations.length / 2)] : 0;

    // Create PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 portrait (pt)
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const drawText = (text: string, size = 12, bold = false) => {
      page.drawText(text, { x: 50, y, size, font: bold ? fontBold : font });
      y -= size + 8;
    };

    drawText("Compliance Copilot – QA Report", 18, true);
    drawText(`Tenant: ${tenant_id}`, 12);
    drawText(`Generated: ${new Date().toISOString()}`, 12);
    y -= 8;

    drawText("Latest QA Suite", 14, true);
    drawText(`Suite: ${qa?.suite ?? "-"}`);
    drawText(`Started: ${qa?.started_at ?? "-"}`);
    drawText(`Finished: ${qa?.finished_at ?? "-"}`);
    drawText(`Cases: total=${qa?.total ?? 0} / passed=${qa?.passed ?? 0} / failed=${qa?.failed ?? 0}`);
    if (qa?.notes) drawText(`Notes: ${qa.notes.slice(0, 200)}`);

    y -= 8;
    drawText("Notification Stats (last 24h)", 14, true);
    drawText(`Sent: ${sent} | Failed: ${failed} | Median latency: ${medianMs} ms`);

    const pdfBytes = await pdf.save();

    // Upload to storage
    const fileName = `qa-reports/${tenant_id}/${new Date().toISOString().slice(0,10)}.pdf`;
    const { error: upErr } = await sbSrv.storage
      .from("qa-reports")
      .upload(fileName, pdfBytes, {
        upsert: true,
        contentType: "application/pdf",
      });
    
    if (upErr) throw upErr;

    console.log(`[generate-qa-report] Report saved to ${fileName}`);

    return new Response(JSON.stringify({ ok: true, path: fileName }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("[generate-qa-report] Error:", e);
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
