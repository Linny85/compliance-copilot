import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { audit_id, tenant_id, user_email, send_email = false } = await req.json();

    if (!audit_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "audit_id and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-audit-report] Processing audit ${audit_id} for tenant ${tenant_id}`);

    // 1. Load audit task data
    const { data: task, error: taskError } = await supabase
      .from("audit_tasks")
      .select(`
        *,
        assigned_user:assigned_to(id, email),
        creator:created_by(id, email)
      `)
      .eq("id", audit_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (taskError || !task) {
      console.error("[generate-audit-report] Task not found:", taskError);
      return new Response(
        JSON.stringify({ error: "Audit task not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Generate PDF
    console.log("[generate-audit-report] Creating PDF document");
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const primaryColor = rgb(0.1, 0.2, 0.3);
    const textColor = rgb(0.2, 0.2, 0.2);
    const lightGray = rgb(0.9, 0.9, 0.9);

    let yPos = height - 60;

    // Header
    page.drawText("POST-IMPLEMENTATION AUDIT REPORT", {
      x: 50,
      y: yPos,
      size: 20,
      font: fontBold,
      color: primaryColor,
    });

    yPos -= 40;
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 2,
      color: primaryColor,
    });

    yPos -= 30;

    // Task Information Section
    const drawField = (label: string, value: string, y: number) => {
      page.drawText(label, {
        x: 50,
        y,
        size: 10,
        font: fontBold,
        color: textColor,
      });
      
      const wrappedValue = wrapText(value || "–", 60);
      const lines = wrappedValue.split("\n");
      let lineY = y - 15;
      
      lines.forEach(line => {
        page.drawText(line, {
          x: 70,
          y: lineY,
          size: 10,
          font: fontRegular,
          color: textColor,
        });
        lineY -= 12;
      });
      
      return lineY - 10;
    };

    yPos = drawField("Title:", task.title, yPos);
    yPos = drawField("Status:", task.status.toUpperCase(), yPos);
    yPos = drawField("Priority:", task.priority?.toUpperCase() || "MEDIUM", yPos);
    
    if (task.description) {
      yPos = drawField("Description:", task.description, yPos);
    }

    yPos -= 20;
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 1,
      color: lightGray,
    });
    yPos -= 20;

    // Findings Section
    if (task.findings) {
      page.drawText("FINDINGS:", {
        x: 50,
        y: yPos,
        size: 12,
        font: fontBold,
        color: primaryColor,
      });
      yPos -= 20;
      
      const findingsLines = wrapText(task.findings, 70).split("\n");
      findingsLines.forEach(line => {
        page.drawText(line, {
          x: 70,
          y: yPos,
          size: 10,
          font: fontRegular,
          color: textColor,
        });
        yPos -= 12;
      });
      yPos -= 10;
    }

    // Corrective Actions Section
    if (task.corrective_actions) {
      page.drawText("CORRECTIVE ACTIONS:", {
        x: 50,
        y: yPos,
        size: 12,
        font: fontBold,
        color: primaryColor,
      });
      yPos -= 20;
      
      const actionsLines = wrapText(task.corrective_actions, 70).split("\n");
      actionsLines.forEach(line => {
        page.drawText(line, {
          x: 70,
          y: yPos,
          size: 10,
          font: fontRegular,
          color: textColor,
        });
        yPos -= 12;
      });
      yPos -= 10;
    }

    // Footer
    const footerY = 80;
    page.drawLine({
      start: { x: 50, y: footerY + 30 },
      end: { x: width - 50, y: footerY + 30 },
      thickness: 1,
      color: lightGray,
    });
    
    page.drawText(`Generated: ${new Date().toLocaleString("en-GB")}`, {
      x: 50,
      y: footerY,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    page.drawText(`Tenant ID: ${tenant_id}`, {
      x: 50,
      y: footerY - 12,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    console.log("[generate-audit-report] PDF generated, size:", pdfBytes.length);

    // 3. Upload to storage
    const timestamp = Date.now();
    const fileName = `audit_${audit_id}_${timestamp}.pdf`;
    const storagePath = `${tenant_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("[generate-audit-report] Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload report", details: uploadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-audit-report] PDF uploaded to:", storagePath);

    // 4. Update audit task
    const { error: updateError } = await supabase
      .from("audit_tasks")
      .update({
        report_generated_at: new Date().toISOString(),
        last_report_path: storagePath,
      })
      .eq("id", audit_id);

    if (updateError) {
      console.error("[generate-audit-report] Update error:", updateError);
    }

    // 5. Log to audit_log
    await supabase.from("audit_log").insert({
      tenant_id,
      actor_id: task.created_by,
      action: "audit_report.generated",
      entity: "audit_task",
      entity_id: audit_id,
      payload: {
        report_path: storagePath,
        file_name: fileName,
      },
    });

    // 6. Optional: Send email (if Postmark is configured)
    if (send_email && user_email && Deno.env.get("POSTMARK_TOKEN")) {
      try {
        console.log("[generate-audit-report] Sending email to:", user_email);
        
        const postmarkResponse = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": Deno.env.get("POSTMARK_TOKEN")!,
          },
          body: JSON.stringify({
            From: Deno.env.get("FROM_EMAIL") || "noreply@norrland-innovate.com",
            To: user_email,
            Subject: `Audit Report: ${task.title}`,
            TextBody: `Your audit report has been generated.\n\nTask: ${task.title}\nStatus: ${task.status}\n\nPlease find the report attached.`,
            Attachments: [{
              Name: fileName,
              Content: btoa(String.fromCharCode(...pdfBytes)),
              ContentType: "application/pdf",
            }],
            MessageStream: "outbound",
          }),
        });

        if (!postmarkResponse.ok) {
          console.error("[generate-audit-report] Email failed:", await postmarkResponse.text());
        } else {
          console.log("[generate-audit-report] Email sent successfully");
        }
      } catch (emailError) {
        console.error("[generate-audit-report] Email error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        path: storagePath,
        file_name: fileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-audit-report] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to wrap text
function wrapText(text: string, maxCharsPerLine: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}
