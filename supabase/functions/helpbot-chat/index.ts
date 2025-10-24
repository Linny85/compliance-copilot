import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_HISTORY = 5; // Last N messages to include in context

type ChatRequest = {
  question: string;
  session_id?: string | null;
  lang?: "de" | "en" | "sv";
  jurisdiction?: string;
  user_id?: string | null;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = (await req.json()) as ChatRequest;
    const { question, session_id, lang = "de", jurisdiction = "EU", user_id } = body;

    if (!question?.trim()) {
      return json({ error: "Question is required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1️⃣ Session prüfen / anlegen
    let sid = session_id;
    if (!sid) {
      const { data: newSession, error: sessErr } = await sb
        .from("helpbot_sessions")
        .insert({
          user_id: user_id ?? null,
          lang,
          jurisdiction,
        })
        .select("id")
        .single();

      if (sessErr) {
        console.error("[helpbot-chat] Session creation failed:", sessErr);
        throw new Error("Failed to create session");
      }
      sid = newSession.id;
    } else {
      // Update last_activity
      await sb
        .from("helpbot_sessions")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", sid);
    }

    // 2️⃣ Letzte N Nachrichten laden
    const { data: history, error: histErr } = await sb
      .from("helpbot_messages")
      .select("role, content")
      .eq("session_id", sid)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY);

    if (histErr) {
      console.error("[helpbot-chat] History fetch failed:", histErr);
    }

    const contextMsgs = history?.map((m) => ({ role: m.role, content: m.content })) ?? [];

    // 3️⃣ Anfrage an helpbot-query (RAG)
    const { data: ragData, error: ragErr } = await sb.functions.invoke("helpbot-query", {
      body: { question, lang, jurisdiction },
    });

    if (ragErr) {
      console.error("[helpbot-chat] RAG query failed:", ragErr);
      throw new Error(`RAG query failed: ${ragErr.message}`);
    }

    const answer = ragData?.answer ?? "Keine Antwort gefunden.";
    const sources = ragData?.sources ?? [];
    const disclaimer = ragData?.disclaimer ?? "";

    // 4️⃣ Verlauf speichern
    const { error: insertErr } = await sb.from("helpbot_messages").insert([
      { session_id: sid, role: "user", content: question },
      { session_id: sid, role: "assistant", content: answer },
    ]);

    if (insertErr) {
      console.error("[helpbot-chat] Failed to save messages:", insertErr);
    }

    return json({
      ok: true,
      session_id: sid,
      answer,
      sources,
      disclaimer,
      history: [...contextMsgs, { role: "user", content: question }, { role: "assistant", content: answer }],
    });
  } catch (e: any) {
    console.error("[helpbot-chat]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
