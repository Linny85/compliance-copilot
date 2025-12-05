import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { chatCompletion } from "../_shared/aiClient.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUMMARY_MODEL = Deno.env.get("HELPBOT_SUMMARY_MODEL") ?? Deno.env.get("MODEL") ?? "gpt-4.1-mini";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const { session_id, lang = "de" } = await req.json();

    if (!session_id) {
      return json({ error: "session_id is required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[helpbot-summary] Summarizing session ${session_id} in ${lang}`);

    // Fetch all messages from the session
    const { data: msgs, error: msgErr } = await sb
      .from("helpbot_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("[helpbot-summary] Error fetching messages:", msgErr);
      throw msgErr;
    }

    if (!msgs || msgs.length === 0) {
      console.log("[helpbot-summary] No messages found for session");
      return json({ error: "No messages found" }, 404);
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
      ]
    });

    const summary = completion.content;
    const usage = completion.usage;
    const tokens = typeof usage === "object" && usage !== null && "total_tokens" in usage
      ? Number((usage as { total_tokens?: number }).total_tokens ?? 0)
      : 0;

    // Save summary to database
    const { error: insertErr } = await sb.from("helpbot_summaries").insert({
      session_id,
      summary,
      lang,
      tokens
    });

    if (insertErr) {
      console.error("[helpbot-summary] Error saving summary:", insertErr);
      throw insertErr;
    }

    console.log(`[helpbot-summary] Summary created successfully (${tokens} tokens)`);

    return json({ ok: true, summary, tokens });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[helpbot-summary] Error:", error);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
