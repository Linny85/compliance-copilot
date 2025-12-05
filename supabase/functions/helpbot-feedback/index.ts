import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, json as jsonResponse } from "../_shared/cors.ts";
import { assertOrigin, requireUserAndTenant, sessionBelongsToTenant } from "../_shared/access.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const originCheck = assertOrigin(req);
  if (originCheck) return originCheck;
  const cors = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405, req);
    }

    const access = requireUserAndTenant(req);
    if (access instanceof Response) return access;
    const { userId, tenantId } = access;

    let payload: { message_id?: string; rating?: number; comment?: string };
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, req);
    }

    const { message_id, rating, comment } = payload ?? {};
    const normalizedRating = Number(rating);

    if (!message_id || ![-1, 0, 1].includes(normalizedRating)) {
      return json({ error: "Invalid input: message_id required and rating must be -1, 0, or 1" }, 400, req);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: message, error: messageErr } = await sb
      .from("helpbot_messages")
      .select("session_id")
      .eq("id", message_id)
      .maybeSingle();

    if (messageErr || !message || !sessionBelongsToTenant(message.session_id, tenantId)) {
      return json({ error: "Message not found" }, 404, req);
    }

    console.log(`[helpbot-feedback] Received feedback for message ${message_id}: rating=${normalizedRating}`);

    // Save feedback
    const { error: insertErr } = await sb.from("helpbot_feedback").insert({
      message_id,
      user_id: userId,
      rating: normalizedRating,
      comment: comment ?? null
    });

    if (insertErr) {
      console.error("[helpbot-feedback] Error saving feedback:", insertErr);
      throw insertErr;
    }

    // Adjust relevance score based on feedback
    const delta = normalizedRating === 1 ? 0.05 : normalizedRating === -1 ? -0.05 : 0;
    
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

    return json({ ok: true, message: "Feedback saved successfully" }, 200, req);
  } catch (e: any) {
    console.error("[helpbot-feedback] Error:", e);
    return json({ error: e?.message ?? "Internal error" }, 500, req);
  }
});

function json(body: any, status = 200, req?: Request) {
  return jsonResponse(body, status, req);
}
