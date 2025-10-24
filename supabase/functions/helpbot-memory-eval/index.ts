import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const EMB_MODEL = "text-embedding-3-large";
const EMB_DIMENSIONS = 1536;
const MAX_CONTEXT_MESSAGES = 10;

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

    const { session_id, question } = await req.json();

    if (!session_id || !question?.trim()) {
      return json({ error: "session_id and question required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[helpbot-memory-eval] Evaluating relevance for session ${session_id}`);

    // 1️⃣ Generate embedding for current question
    const qEmb = await embed(question);

    // 2️⃣ Retrieve all previous messages with embeddings
    const { data: msgs, error: msgErr } = await sb
      .from("helpbot_messages")
      .select("id, role, content, embedding, created_at")
      .eq("session_id", session_id)
      .not("embedding", "is", null);

    if (msgErr) {
      console.error("[helpbot-memory-eval] Error fetching messages:", msgErr);
      throw msgErr;
    }

    if (!msgs || msgs.length === 0) {
      console.log("[helpbot-memory-eval] No messages with embeddings found");
      return json({ top_messages: [], count: 0 });
    }

    // 3️⃣ Calculate cosine similarity for each message
    const scored = msgs.map(m => ({
      ...m,
      sim: cosine(m.embedding as number[], qEmb)
    })).sort((a, b) => b.sim - a.sim);

    // 4️⃣ Keep top N most relevant
    const top = scored.slice(0, MAX_CONTEXT_MESSAGES);

    // 5️⃣ Update relevance scores in database
    const updates = top.map(async (t) => {
      const { error } = await sb
        .from("helpbot_messages")
        .update({ relevance: t.sim })
        .eq("id", t.id);
      
      if (error) {
        console.error(`[helpbot-memory-eval] Error updating relevance for ${t.id}:`, error);
      }
      return { id: t.id, relevance: t.sim };
    });

    await Promise.all(updates);

    console.log(`[helpbot-memory-eval] Scored ${msgs.length} messages, kept top ${top.length}`);

    return json({
      ok: true,
      top_messages: top.map(t => ({
        id: t.id,
        role: t.role,
        content: t.content,
        similarity: t.sim,
        created_at: t.created_at
      })),
      count: top.length,
      total_evaluated: msgs.length
    });
  } catch (e: any) {
    console.error("[helpbot-memory-eval] Error:", e);
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
    throw new Error(data?.error?.message ?? "Embedding failed");
  }

  return data.data[0].embedding as number[];
}

function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }

  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magA === 0 || magB === 0) return 0;
  
  return dot / (magA * magB);
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
