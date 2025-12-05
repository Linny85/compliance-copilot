// deno-lint-ignore-file no-explicit-any
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildCorsHeaders, json as jsonResponse } from "../_shared/cors.ts";
import { assertOrigin, requireUserAndTenant } from "../_shared/access.ts";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sbAdmin = createClient(URL, SERVICE_KEY);

function json(body: unknown, status = 200, req?: Request) {
  return jsonResponse(body, status, req);
}

Deno.serve(async (req) => {
  const originCheck = assertOrigin(req);
  if (originCheck) return originCheck;
  const cors = buildCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405, req);
  }

  const access = requireUserAndTenant(req);
  if (access instanceof Response) return access;
  const { tenantId, userId } = access;

  try {
    const { data: roles, error: rolesError } = await sbAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", tenantId)
      .in("role", ["admin", "master_admin"]);

    if (rolesError) throw rolesError;
    if (!roles || roles.length === 0) {
      return json({ error: "FORBIDDEN_ADMIN_ONLY" }, 403, req);
    }

    console.log(`[generate-qa-report] Generating report for tenant ${tenantId}`);

    // Get latest QA result
    const { data: qa } = await sbAdmin
      .from("qa_results")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get 24h stats
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: last24h } = await sbAdmin
      .from("notification_deliveries")
      .select("status_code, duration_ms, channel, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", since);

    const sent = (last24h || []).filter((d) => (d.status_code ?? 0) < 400).length;
    const failed = (last24h || []).length - sent;
    const durations = (last24h || [])
      .map((d) => d.duration_ms)
      .filter(Boolean)
      .sort((a, b) => a - b);
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
    drawText(`Tenant: ${tenantId}`, 12);
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
    const fileName = `qa-reports/${tenantId}/${new Date().toISOString().slice(0, 10)}.pdf`;
    const { error: upErr } = await sbAdmin.storage
      .from("qa-reports")
      .upload(fileName, pdfBytes, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (upErr) throw upErr;

    console.log(`[generate-qa-report] Report saved to ${fileName}`);

    return json({ ok: true, path: fileName }, 200, req);
  } catch (e: any) {
    console.error("[generate-qa-report] Error:", e);
    return json({ error: String(e.message || e) }, 500, req);
  }
});
