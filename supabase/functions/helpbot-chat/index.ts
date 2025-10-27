// supabase/functions/helpbot-chat/index.ts
// Simplified robust version for testing (no DB, no RAG - just CORS + validation + dummy response)

import { corsHeaders } from "../_shared/cors.ts";

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const err = (message: string, reqId: string, status = 400) =>
  json({ error: message, reqId }, status);

type Lang = "de" | "en" | "sv";
const VALID_LANGS: readonly Lang[] = ["de", "en", "sv"];

function normalizeLang(input?: string): Lang {
  const two = (input ?? "de").toLowerCase().slice(0, 2);
  return (VALID_LANGS as readonly string[]).includes(two) ? (two as Lang) : "de";
}

Deno.serve(async (req: Request) => {
  const reqId = crypto.randomUUID();

  try {
    // ✅ CORS Preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return err("Method Not Allowed", reqId, 405);
    }

    // ✅ Content-Type check
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().includes("application/json")) {
      return err("Unsupported Media Type. Expect application/json", reqId, 415);
    }

    // ✅ Robust JSON parsing
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", reqId, 400);
    }

    // ✅ Input validation
    const question = (body?.question ?? "").toString().trim();
    const rawLang = (body?.lang ?? "").toString();
    const sessionId = body?.session_id ?? null;

    if (!question) {
      return err("Missing field: 'question'", reqId, 400);
    }

    if (question.length > 4000) {
      return err("Question too long (max 4000 chars)", reqId, 413);
    }

    const lang = normalizeLang(rawLang);

    // ✅ Log for diagnostics (appears in Supabase logs)
    console.log("[helpbot-chat] input", {
      reqId,
      lang,
      sessionId: sessionId ? "set" : "none",
      hasAuth: !!req.headers.get("authorization"),
      questionLength: question.length,
    });

    // ✅ Generate dummy response based on language
    const replies = {
      de: `Ich bin Kollege Norrly. Ich habe deine Frage erhalten: "${question.slice(0, 50)}${question.length > 50 ? '...' : ''}". Diese Nachricht kommt aus der Edge Function (Dummy-Modus für Tests).`,
      en: `I'm Colleague Norrly. I received your question: "${question.slice(0, 50)}${question.length > 50 ? '...' : ''}". This reply comes from the Edge Function (dummy mode for testing).`,
      sv: `Jag är Kollegan Norrly. Jag har tagit emot din fråga: "${question.slice(0, 50)}${question.length > 50 ? '...' : ''}". Detta svar kommer från Edge-funktionen (dummy-läge för testning).`,
    };

    const reply = replies[lang] || replies.en;

    return json({
      ok: true,
      provider: "DUMMY",
      session_id: sessionId || crypto.randomUUID(),
      answer: reply,
      sources: [],
      disclaimer: lang === "de" 
        ? "⚠️ Testmodus: Keine echte KI-Antwort. Nur für Verbindungstest."
        : "⚠️ Test mode: No real AI response. For connection testing only.",
      reqId,
      debug: {
        receivedLang: rawLang,
        normalizedLang: lang,
        questionLength: question.length,
      },
    });
  } catch (e: any) {
    console.error("[helpbot-chat] fatal error", { reqId, error: String(e), stack: e?.stack });
    return err(`Internal error: ${e?.message ?? 'Unknown'}`, reqId, 500);
  }
});
