import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") || "https://app.norrland-innovate.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = createClient(url, key);

  try {
    const { tenant_id, user_email, user_name } = await req.json();

    if (!tenant_id || !user_email) {
      throw new Error("Missing tenant_id or user_email");
    }

    const now = new Date();
    const jobs = [
      {
        tenant_id,
        to_email: user_email,
        template_alias: "trial_started",
        model: { first_name: user_name || "there", app_url: appUrl },
        scheduled_at: now.toISOString(),
      },
      {
        tenant_id,
        to_email: user_email,
        template_alias: "trial_7d_left",
        model: { first_name: user_name || "there", app_url: appUrl, days_left: 7 },
        scheduled_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        tenant_id,
        to_email: user_email,
        template_alias: "trial_ending_tomorrow",
        model: { first_name: user_name || "there", app_url: appUrl },
        scheduled_at: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        tenant_id,
        to_email: user_email,
        template_alias: "trial_ended",
        model: { first_name: user_name || "there", app_url: appUrl },
        scheduled_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { error } = await sb.from("email_jobs").insert(jobs);
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, jobs_created: jobs.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[enqueue-trial-emails] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
