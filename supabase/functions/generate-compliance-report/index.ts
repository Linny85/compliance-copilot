// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
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

    const { data: profile } = await sb.from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();
    
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No tenant" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const tenant_id = profile.company_id;

    // Admin verification
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

    // Fetch compliance summary
    const { data: compliance } = await sbSrv
      .from("v_compliance_summary")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    // Fetch QA monitor
    const { data: qa } = await sbSrv
      .from("qa_monitor")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    // Fetch company info
    const { data: company } = await sbSrv
      .from("profiles")
      .select("company_id")
      .eq("company_id", tenant_id)
      .limit(1)
      .maybeSingle();

    // Generate PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 portrait
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const drawText = (text: string, size = 12, bold = false, color = rgb(0, 0, 0)) => {
      page.drawText(text, { x: 50, y, size, font: bold ? fontBold : font, color });
      y -= size + 10;
    };

    // Header
    page.drawRectangle({
      x: 0,
      y: 820,
      width: 595.28,
      height: 60,
      color: rgb(0.2, 0.4, 0.8),
    });

    page.drawText("Compliance Copilot", { 
      x: 50, 
      y: 845, 
      size: 24, 
      font: fontBold, 
      color: rgb(1, 1, 1) 
    });

    page.drawText("Compliance Status Report", { 
      x: 50, 
      y: 825, 
      size: 12, 
      font, 
      color: rgb(1, 1, 1) 
    });

    y = 780;

    // Report metadata
    drawText(`Generated: ${new Date().toISOString().split('T')[0]}`, 10, false, rgb(0.5, 0.5, 0.5));
    drawText(`Tenant ID: ${tenant_id}`, 10, false, rgb(0.5, 0.5, 0.5));
    y -= 10;

    // Compliance Overview
    drawText("Compliance Overview", 18, true, rgb(0.2, 0.4, 0.8));
    y -= 5;

    if (compliance) {
      const successRate = compliance.success_rate || 0;
      const statusColor = successRate >= 80 
        ? rgb(0, 0.6, 0) 
        : successRate >= 60 
          ? rgb(0.8, 0.6, 0)
          : rgb(0.8, 0, 0);

      drawText(`Total Checks: ${compliance.total || 0}`, 12);
      drawText(`✓ Passed: ${compliance.passed || 0}`, 12, false, rgb(0, 0.6, 0));
      drawText(`✗ Failed: ${compliance.failed || 0}`, 12, false, rgb(0.8, 0, 0));
      drawText(`⚠ Warnings: ${compliance.warnings || 0}`, 12, false, rgb(0.8, 0.6, 0));
      drawText(`Success Rate: ${successRate}%`, 14, true, statusColor);
      if (compliance.last_run_at) {
        drawText(`Last Run: ${new Date(compliance.last_run_at).toLocaleString()}`, 10);
      }
    } else {
      drawText("No compliance data available", 12, false, rgb(0.5, 0.5, 0.5));
    }

    y -= 15;

    // QA Monitor Status
    drawText("QA Monitor Status", 18, true, rgb(0.2, 0.4, 0.8));
    y -= 5;

    if (qa) {
      drawText(`Last QA Run: ${qa.last_run_status || 'N/A'}`, 12);
      drawText(`Average Latency: ${Math.round(qa.avg_latency_ms || 0)} ms`, 12);
      drawText(`Failed Notifications (24h): ${qa.failed_24h || 0}`, 12, false, 
        qa.failed_24h > 0 ? rgb(0.8, 0, 0) : rgb(0, 0.6, 0));
      if (qa.last_run_at) {
        drawText(`Last Updated: ${new Date(qa.last_run_at).toLocaleString()}`, 10);
      }
    } else {
      drawText("No QA monitor data available", 12, false, rgb(0.5, 0.5, 0.5));
    }

    y -= 15;

    // Recommendations
    drawText("Recommendations", 18, true, rgb(0.2, 0.4, 0.8));
    y -= 5;

    const recommendations: string[] = [];
    
    if (compliance) {
      if (compliance.failed > 0) {
        recommendations.push(`• Address ${compliance.failed} failed check(s) to improve compliance`);
      }
      if ((compliance.success_rate || 0) < 80) {
        recommendations.push("• Success rate below 80% - review and update control mappings");
      }
    }
    
    if (qa && qa.failed_24h > 0) {
      recommendations.push(`• ${qa.failed_24h} notification failure(s) detected - check system health`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push("✓ All systems operating nominally");
    }

    recommendations.forEach(rec => {
      drawText(rec, 11);
    });

    y -= 15;

    // Footer
    page.drawText("Generated by Compliance Copilot | Confidential", {
      x: 50,
      y: 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdf.save();

    // Upload to storage
    const fileName = `compliance-reports/${tenant_id}/${new Date().toISOString().slice(0,10)}.pdf`;
    const { error: uploadError } = await sbSrv.storage
      .from('compliance-reports')
      .upload(fileName, pdfBytes, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) throw uploadError;

    // Send email to admins
    const { data: adminProfiles } = await sbSrv
      .from("profiles")
      .select("email, user_roles!inner(role)")
      .eq("company_id", tenant_id)
      .in("user_roles.role", ["admin", "master_admin"]);

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];

    if (adminEmails.length > 0) {
      const emailSubject = `Weekly Compliance Report - ${new Date().toISOString().slice(0,10)}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Compliance Copilot</h1>
            <p style="margin: 5px 0 0 0;">Weekly Compliance Report</p>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Compliance Overview</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total Checks</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${compliance?.total || 0}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Passed</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #16a34a;">${compliance?.passed || 0}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Failed</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${compliance?.failed || 0}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Success Rate</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${compliance?.success_rate || 0}%</strong></td>
              </tr>
            </table>

            <h2 style="color: #1f2937; margin-top: 20px;">QA Monitor</h2>
            <p>Average Latency: <strong>${Math.round(qa?.avg_latency_ms || 0)} ms</strong></p>
            <p>Failed Notifications (24h): <strong>${qa?.failed_24h || 0}</strong></p>

            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
              <p style="margin: 0;">📄 Full report attached as PDF</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
                Or view it in your admin dashboard at any time.
              </p>
            </div>
          </div>

          <div style="padding: 15px; background: #1f2937; color: white; text-align: center; font-size: 12px;">
            Generated by Compliance Copilot | ${new Date().toISOString().split('T')[0]}
          </div>
        </div>
      `;

      await fetch(`${URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_id,
          to: adminEmails,
          subject: emailSubject,
          html: emailHtml,
        }),
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      path: fileName,
      emailsSent: adminEmails.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[generate-compliance-report] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
