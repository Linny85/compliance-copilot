import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MAX_HISTORY = 10; // Max relevant messages to include in context
const EMB_MODEL = "text-embedding-3-large";
const EMB_DIMENSIONS = 1536;

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

    // 2️⃣ Use semantic memory evaluation to get relevant messages
    let contextMsgs: Array<{ role: string; content: string }> = [];
    
    try {
      // Try to get semantically relevant messages
      const { data: evalData, error: evalErr } = await sb.functions.invoke("helpbot-memory-eval", {
        body: { session_id: sid, question }
      });

      if (evalErr) {
        console.warn("[helpbot-chat] Memory eval failed, falling back to recent messages:", evalErr);
        // Fallback to recent messages
        const { data: history } = await sb
          .from("helpbot_messages")
          .select("role, content")
          .eq("session_id", sid)
          .order("created_at", { ascending: false })
          .limit(MAX_HISTORY);
        
        contextMsgs = history?.map((m) => ({ role: m.role, content: m.content })).reverse() ?? [];
      } else {
        // Use semantically relevant messages
        contextMsgs = evalData?.top_messages?.map((m: any) => ({
          role: m.role,
          content: m.content
        })) ?? [];
        
        console.log(`[helpbot-chat] Using ${contextMsgs.length} semantically relevant messages`);
      }
    } catch (e) {
      console.error("[helpbot-chat] Error in memory evaluation:", e);
      // Fallback to recent messages
      const { data: history } = await sb
        .from("helpbot_messages")
        .select("role, content")
        .eq("session_id", sid)
        .order("created_at", { ascending: false })
        .limit(MAX_HISTORY);
      
      contextMsgs = history?.map((m) => ({ role: m.role, content: m.content })).reverse() ?? [];
    }

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

    // 4️⃣ Generate embeddings for new messages
    const questionEmb = await embed(question);
    const answerEmb = await embed(answer);

    // 5️⃣ Save messages with embeddings and get IDs
    const { data: insertedMsgs, error: insertErr } = await sb.from("helpbot_messages").insert([
      { 
        session_id: sid, 
        role: "user", 
        content: question,
        embedding: questionEmb,
        relevance: 1.0
      },
      { 
        session_id: sid, 
        role: "assistant", 
        content: answer,
        embedding: answerEmb,
        relevance: 1.0
      },
    ]).select("id, role");

    if (insertErr) {
      console.error("[helpbot-chat] Failed to save messages:", insertErr);
    }

    // Extract the assistant message ID for feedback
    const assistantMsgId = insertedMsgs?.find(m => m.role === "assistant")?.id;

    return json({
      ok: true,
      session_id: sid,
      answer,
      sources,
      disclaimer,
      history: [
        ...contextMsgs, 
        { role: "user", content: question }, 
        { role: "assistant", content: answer, id: assistantMsgId }
      ],
    });
  } catch (e: any) {
    console.error("[helpbot-chat]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

async function embed(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: EMB_MODEL,
      input: text,
      dimensions: EMB_DIMENSIONS
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("[helpbot-chat] Embedding error:", data);
    throw new Error(data?.error?.message ?? "Embedding failed");
  }

  return data.data[0].embedding as number[];
}

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
