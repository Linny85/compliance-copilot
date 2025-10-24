import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const { message_id, user_id, rating, comment } = await req.json();

    if (!message_id || ![-1, 0, 1].includes(rating)) {
      return json({ error: "Invalid input: message_id required and rating must be -1, 0, or 1" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[helpbot-feedback] Received feedback for message ${message_id}: rating=${rating}`);

    // Save feedback
    const { error: insertErr } = await sb.from("helpbot_feedback").insert({
      message_id,
      user_id: user_id ?? null,
      rating,
      comment: comment ?? null
    });

    if (insertErr) {
      console.error("[helpbot-feedback] Error saving feedback:", insertErr);
      throw insertErr;
    }

    // Adjust relevance score based on feedback
    const delta = rating === 1 ? 0.05 : rating === -1 ? -0.05 : 0;
    
    if (delta !== 0) {
      const { error: adjustErr } = await sb.rpc("adjust_relevance", {
        p_message_id: message_id,
        p_delta: delta
      });

      if (adjustErr) {
        console.error("[helpbot-feedback] Error adjusting relevance:", adjustErr);
        // Don't throw - feedback is saved even if relevance adjustment fails
      } else {
        console.log(`[helpbot-feedback] Relevance adjusted by ${delta} for message ${message_id}`);
      }
    }

    return json({ ok: true, message: "Feedback saved successfully" });
  } catch (e: any) {
    console.error("[helpbot-feedback] Error:", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
