import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 🛡️ Webhook-Absicherung
  const webhookSecret = Deno.env.get("POSTMARK_WEBHOOK_SECRET");
  if (webhookSecret) {
    const token = req.headers.get("x-postmark-webhook-token");
    if (token !== webhookSecret) {
      console.warn("[webhook-bounce] Invalid webhook token");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
  }

  try {
    const payload = await req.json();
    const sb = createClient(url, key);

    // Log event
    await sb.from("email_events").insert({
      message_id: payload.MessageID,
      event_type: payload.RecordType?.toLowerCase() || "bounce",
      email: payload.Email,
      payload: payload,
    });

    // For hard bounces and spam complaints, add to suppression list
    if (
      payload.RecordType === "HardBounce" ||
      payload.RecordType === "SpamComplaint"
    ) {
      await sb
        .from("email_suppressions")
        .upsert({
          email: payload.Email,
          reason: payload.RecordType,
        })
        .onConflict("email");
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (error: any) {
    console.error("[webhook-bounce] Error:", error);
    return new Response(error.message, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
