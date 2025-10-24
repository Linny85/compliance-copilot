import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { chat } from "../_shared/lovableClient.ts";
import { logInfo, logError } from "../_shared/logger.ts";

const MODEL = Deno.env.get("MODEL") ?? "google/gemini-2.5-flash";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = performance.now();
  let status = 200;

  try {
    if (req.method !== "POST") {
      status = 405;
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

    // Generate summary using AI via centralized client
    const systemPrompt = lang === "en" 
      ? "You are a summarization assistant. Create a concise, factual summary of the following conversation."
      : lang === "sv"
      ? "Du är en sammanfattningsassistent. Skapa en koncis, saklig sammanfattning av följande konversation."
      : "Du bist ein Zusammenfassungs-Assistent. Erstelle eine prägnante, sachliche Zusammenfassung des folgenden Gesprächs.";

    const summary = await chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ], MODEL);

    const tokens = summary.length; // Approximate token count

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

    // Strukturiertes Logging
    await logInfo({
      func: "helpbot-summary",
      message: "summary created successfully",
      tenant_id: null,
      session_id,
      using_proxy: null,
      base_url: null,
      path: "/v1/chat",
      method: "POST",
      status,
      latency_ms: Math.round(performance.now() - t0),
      error_code: null,
      details: { tokens, lang }
    });

    return json({ ok: true, summary, tokens });
  } catch (e: any) {
    status = 500;
    const errMsg = e?.message ?? "Internal error";

    await logError({
      func: "helpbot-summary",
      message: "unhandled exception",
      status,
      latency_ms: Math.round(performance.now() - t0),
      error_code: "UNHANDLED",
      details: { error: errMsg }
    });

    console.error("[helpbot-summary] Error:", e);
    return json({ error: errMsg }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
