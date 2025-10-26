import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWithTemplate } from "../email/client.ts";
import { corsHeaders } from "../_shared/cors.ts";

const BATCH_SIZE = 50;
const MAX_RETRIES = 5;

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = createClient(url, key);
  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    // Fetch pending jobs
    const { data: jobs, error } = await sb
      .from("email_jobs")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;

    for (const job of jobs || []) {
      processed++;
      
      try {
        // Check suppression list
        const { data: suppressed } = await sb
          .from("email_suppressions")
          .select("email")
          .eq("email", job.to_email)
          .maybeSingle();

        if (suppressed) {
          await sb
            .from("email_jobs")
            .update({ status: "blocked", last_error: "Email suppressed" })
            .eq("id", job.id);
          failed++;
          continue;
        }

        // Send email
        const result = await sendWithTemplate(
          job.to_email,
          job.template_alias,
          job.model,
          job.message_stream as "outbound" | "broadcast"
        );

        // Mark as sent
        await sb
          .from("email_jobs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        sent++;

        // Log event
        await sb.from("email_events").insert({
          message_id: result.MessageID,
          event_type: "sent",
          email: job.to_email,
          payload: { template_alias: job.template_alias },
        });
      } catch (error: any) {
        const newRetryCount = (job.retry_count || 0) + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? "failed" : "queued";

        await sb
          .from("email_jobs")
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            last_error: error.message?.slice(0, 500),
          })
          .eq("id", job.id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, sent, failed }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[email-dispatcher] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message, processed, sent, failed }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
