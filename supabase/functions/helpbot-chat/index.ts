// supabase/functions/helpbot-chat/index.ts
// Chat-Endpoint mit CORS, Dual-Provider, Conversational Memory & (optional) Graph-Lernen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/** =========================
 *  Konfiguration
 *  ========================= */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Dual-Provider: bevorzugt LOVABLE, sonst OpenAI.
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const PROVIDER = LOVABLE_API_KEY ? "LOVABLE" : "OPENAI";
const BASE_URL = PROVIDER === "LOVABLE"
  ? "https://ai.gateway.lovable.dev/v1"
  : "https://api.openai.com/v1";
const API_KEY = PROVIDER === "LOVABLE" ? LOVABLE_API_KEY! : OPENAI_API_KEY!;

// Modelle (ggf. anpassen)
const MODEL = Deno.env.get("HELPBOT_CHAT_MODEL") ?? "gpt-4o-mini";
const EMB_MODEL = Deno.env.get("HELPBOT_EMB_MODEL") ?? "text-embedding-3-large";
const EMB_DIMENSIONS = Number(Deno.env.get("HELPBOT_EMB_DIMENSIONS") ?? "1536");

// RAG/Memory
const TOP_K = Number(Deno.env.get("HELPBOT_TOP_K") ?? "6");
const MAX_HISTORY = Number(Deno.env.get("HELPBOT_MAX_HISTORY") ?? "12");

// Optional: Graph-aware RAG nutzen, bei Fehler auf klassisches RAG zurückfallen
const USE_GRAPH_AWARE = (Deno.env.get("HELPBOT_USE_GRAPH_AWARE") ?? "true") === "true";

/** =========================
 *  Edge Handler
 *  ========================= */
Deno.serve(async (req) => {
  // ✅ CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = await req.json() as {
      question: string;
      session_id?: string | null;
      lang?: "de" | "en" | "sv";
      jurisdiction?: string | null;
      user_id?: string | null;
    };

    const question = (body.question ?? "").trim();
    const lang = (body.lang ?? "de").slice(0, 2).toLowerCase() as "de" | "en" | "sv";
    const jurisdiction = body.jurisdiction ?? "EU";

    if (!question) {
      return json({ error: "Question is required" }, 400);
    }
    
    if (!["de", "en", "sv"].includes(lang)) {
      return json({ error: "Invalid language. Must be de, en, or sv" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Session prüfen/anlegen
    let sid = body.session_id ?? null;
    if (!sid) {
      const { data: newSession, error: sessErr } = await sb
        .from("helpbot_sessions")
        .insert({ user_id: body.user_id ?? null, lang, jurisdiction })
        .select("id")
        .single();
      if (sessErr) throw sessErr;
      sid = newSession.id;
    } else {
      await sb.from("helpbot_sessions")
        .update({ last_activity: new Date().toISOString(), lang, jurisdiction })
        .eq("id", sid);
    }

    // 2) Semantisch relevante Nachrichten besorgen (Eval), Fallback: jüngste N
    let contextMsgs: Array<{ role: string; content: string }> = [];
    try {
      const { data: evalData, error: evalErr } = await sb.functions.invoke(
        "helpbot-memory-eval",
        { body: { session_id: sid, question } }
      );
      if (evalErr) throw evalErr;

      contextMsgs = evalData?.top_messages?.map((m: any) => ({
        role: m.role, content: m.content,
      })) ?? [];
      // Falls nix kommt, Fallback holen
      if (contextMsgs.length === 0) throw new Error("No semantic hits");
    } catch {
      const { data: history } = await sb
        .from("helpbot_messages")
        .select("role, content")
        .eq("session_id", sid)
        .order("created_at", { ascending: false })
        .limit(MAX_HISTORY);
      contextMsgs = (history ?? [])
        .reverse()
        .map((m) => ({ role: m.role, content: m.content }));
    }

    // 3) RAG-Aufruf: bevorzugt Graph-aware, ansonsten klassisch
    let ragAnswer = "";
    let sources: Array<{ title: string; uri: string }> = [];
    let disclaimer = disclaimerByLang(lang);

    const userForRag = { question, lang, jurisdiction, top_k: TOP_K };

    if (USE_GRAPH_AWARE) {
      const { data, error } = await sb.functions.invoke("helpbot-graph-query", {
        body: userForRag,
      });
      if (!error && data?.answer) {
        ragAnswer = data.answer;
        sources = data?.sources ?? [];
        disclaimer = data?.disclaimer ?? disclaimer;
      } else {
        // Fallback auf klassisches RAG
        const { data: data2, error: err2 } = await sb.functions.invoke("helpbot-query", {
          body: userForRag,
        });
        if (err2) throw err2;
        ragAnswer = data2?.answer ?? "";
        sources = data2?.sources ?? [];
        disclaimer = data2?.disclaimer ?? disclaimer;
      }
    } else {
      const { data, error } = await sb.functions.invoke("helpbot-query", {
        body: userForRag,
      });
      if (error) throw error;
      ragAnswer = data?.answer ?? "";
      sources = data?.sources ?? [];
      disclaimer = data?.disclaimer ?? disclaimer;
    }

    if (!ragAnswer) {
      ragAnswer = noAnswerByLang(lang);
    }

    // 4) Verlauf speichern (und IDs zurückgeben)
    const { data: inserted, error: insErr } = await sb
      .from("helpbot_messages")
      .insert([
        { session_id: sid, role: "user", content: question },
        { session_id: sid, role: "assistant", content: ragAnswer },
      ])
      .select("id,role")
      .order("created_at", { ascending: true });

    if (insErr) {
      console.error("[helpbot-chat] Failed to save messages:", insErr);
    }

    const userMsgId = inserted?.find((m) => m.role === "user")?.id;
    const assistantMsgId = inserted?.find((m) => m.role === "assistant")?.id;

    // 5) (Optional) Knowledge-Graph-Extraktion "fire & forget"
    //    — blockiert die Antwort nicht
    if (userMsgId) {
      sb.functions.invoke("helpbot-graph-extract", {
        body: { message_id: userMsgId, content: question, lang },
      }).catch((e) => console.error("[graph-extract user] ", e));
    }
    if (assistantMsgId) {
      sb.functions.invoke("helpbot-graph-extract", {
        body: { message_id: assistantMsgId, content: ragAnswer, lang },
      }).catch((e) => console.error("[graph-extract assistant] ", e));
    }

    // 6) Antwort
    return json({
      ok: true,
      provider: PROVIDER,
      session_id: sid,
      answer: ragAnswer,
      sources,
      disclaimer,
      history: [
        ...contextMsgs,
        { role: "user", content: question },
        { role: "assistant", content: ragAnswer, id: assistantMsgId },
      ],
    });
  } catch (e: any) {
    console.error("[helpbot-chat]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

/** =========================
 *  Utils
 *  ========================= */
function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function disclaimerByLang(lang: string) {
  if (lang === "en") return "Note: not legal advice. Answers are based only on the provided sources.";
  if (lang === "sv") return "Obs: ingen juridisk rådgivning. Svaren bygger endast på tillhandahållna källor.";
  return "Hinweis: keine Rechtsberatung. Antworten basieren ausschließlich auf den bereitgestellten Quellen.";
}

function noAnswerByLang(lang: string) {
  if (lang === "en") return "I couldn't find a reliable source for that in my knowledge base.";
  if (lang === "sv") return "Jag hittade ingen tillförlitlig källa för detta i kunskapsbasen.";
  return "Dafür habe ich in meinen Quellen keine belastbare Stelle gefunden.";
}
