import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, json as jsonResponse } from "../_shared/cors.ts";
import { chatCompletion } from "../_shared/aiClient.ts";
import { assertOrigin, requireUserAndTenant, sessionBelongsToTenant } from "../_shared/access.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUMMARY_MODEL = Deno.env.get("HELPBOT_SUMMARY_MODEL") ?? Deno.env.get("MODEL") ?? "gpt-4.1-mini";

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
    const { tenantId } = access;

    let payload: { session_id?: string; lang?: string };
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, req);
    }

    const sessionId = payload.session_id?.toString() ?? "";
    const lang = (payload.lang ?? "de") as string;

    if (!sessionId) {
      return json({ error: "session_id is required" }, 400, req);
    }

    if (!sessionBelongsToTenant(sessionId, tenantId)) {
      return json({ error: "Session not found" }, 404, req);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[helpbot-summary] Summarizing session ${sessionId} in ${lang}`);

    // Fetch all messages from the session
    const { data: msgs, error: msgErr } = await sb
      .from("helpbot_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("[helpbot-summary] Error fetching messages:", msgErr);
      throw msgErr;
    }

    if (!msgs || msgs.length === 0) {
      console.log("[helpbot-summary] No messages found for session");
      return json({ error: "No messages found" }, 404, req);
    }

    // Create conversation text
    const text = msgs.map(m => `${m.role}: ${m.content}`).join("\n");

    // Generate summary using AI
    const systemPrompt = lang === "en" 
      ? "You are a summarization assistant. Create a concise, factual summary of the following conversation."
      : lang === "sv"
      ? "Du är en sammanfattningsassistent. Skapa en koncis, saklig sammanfattning av följande konversation."
      : "Du bist ein Zusammenfassungs-Assistent. Erstelle eine prägnante, sachliche Zusammenfassung des folgenden Gesprächs.";

    const completion = await chatCompletion({
      model: SUMMARY_MODEL,
      maxTokens: 400,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      tenantId,
    });

    const summary = completion.content;
    const usage = completion.usage;
    const tokens = typeof usage === "object" && usage !== null && "total_tokens" in usage
      ? Number((usage as { total_tokens?: number }).total_tokens ?? 0)
      : 0;

    // Save summary to database
    const { error: insertErr } = await sb.from("helpbot_summaries").insert({
      session_id: sessionId,
      summary,
      lang,
      tokens
    });

    if (insertErr) {
      console.error("[helpbot-summary] Error saving summary:", insertErr);
      throw insertErr;
    }

    console.log(`[helpbot-summary] Summary created successfully (${tokens} tokens)`);

    return json({ ok: true, summary, tokens }, 200, req);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[helpbot-summary] Error:", error);
    return json({ error: message }, 500, req);
  }
});

function json(body: unknown, status = 200, req?: Request) {
  return jsonResponse(body, status, req);
}
