import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const EMB_MODEL = "text-embedding-3-large";
const EMB_DIMENSIONS = 1536;
const BATCH_SIZE = 50;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[helpbot-memory-train] Starting background embedding generation");

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch messages without embeddings
    const { data: msgs, error: fetchErr } = await sb
      .from("helpbot_messages")
      .select("id, content, role")
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (fetchErr) {
      console.error("[helpbot-memory-train] Error fetching messages:", fetchErr);
      throw fetchErr;
    }

    if (!msgs || msgs.length === 0) {
      console.log("[helpbot-memory-train] No messages to process");
      return json({ ok: true, processed: 0, message: "No messages to embed" });
    }

    console.log(`[helpbot-memory-train] Processing ${msgs.length} messages`);

    // Process in batches to avoid rate limits
    let processed = 0;
    let failed = 0;

    for (const msg of msgs) {
      try {
        // Generate embedding
        const embedding = await embed(msg.content);

        // Update message with embedding
        const { error: updateErr } = await sb
          .from("helpbot_messages")
          .update({ 
            embedding,
            relevance: 1.0 // Default relevance for newly embedded messages
          })
          .eq("id", msg.id);

        if (updateErr) {
          console.error(`[helpbot-memory-train] Error updating message ${msg.id}:`, updateErr);
          failed++;
        } else {
          processed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error(`[helpbot-memory-train] Error processing message ${msg.id}:`, e);
        failed++;
      }
    }

    console.log(`[helpbot-memory-train] Completed: ${processed} successful, ${failed} failed`);

    return json({
      ok: true,
      processed,
      failed,
      total: msgs.length
    });
  } catch (e: any) {
    console.error("[helpbot-memory-train] Error:", e);
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

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
