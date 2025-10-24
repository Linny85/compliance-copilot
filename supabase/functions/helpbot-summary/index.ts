import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// =========================================================
// 🌐 Dual-Provider Configuration (Lovable + OpenAI Fallback)
// =========================================================

const PROVIDER = Deno.env.get("AI_PROVIDER") ?? "lovable";

const API_KEY = PROVIDER === "openai"
  ? Deno.env.get("OPENAI_API_KEY")
  : Deno.env.get("LOVABLE_API_KEY");

const BASE_URL = PROVIDER === "openai"
  ? Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1"
  : Deno.env.get("LOVABLE_BASE_URL") ?? "https://ai.gateway.lovable.dev/v1";

const MODEL = Deno.env.get("MODEL") ?? "google/gemini-2.5-flash";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function logProvider() {
  console.log(`[AI Provider] ${PROVIDER.toUpperCase()} → ${BASE_URL}`);
}
logProvider();

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

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        max_tokens: 400
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[helpbot-summary] AI error:", data);
      throw new Error(data?.error?.message ?? "AI error");
    }

    const summary = data.choices[0].message.content;
    const tokens = data.usage?.total_tokens ?? 0;

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
  } catch (e: any) {
    console.error("[helpbot-summary] Error:", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
