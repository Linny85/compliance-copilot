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
const EMB_MODEL = Deno.env.get("EMB_MODEL") ?? "text-embedding-3-large";
const EMB_DIMENSIONS = Number(Deno.env.get("EMB_DIMENSIONS") ?? "1536");

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

    const { query, lang = "de", jurisdiction = "EU", limit = 6 } = await req.json();

    if (!query?.trim()) {
      return json({ error: "Query is required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[helpbot-graph-query] Processing query in ${lang}: "${query}"`);

    // 1️⃣ Generate embedding for query
    const queryEmb = await embed(query);

    // 2️⃣ Find relevant entities from the knowledge graph
    const { data: entities, error: entErr } = await sb.rpc("match_helpbot_entities", {
      query_vec: queryEmb,
      match_count: 5
    });

    if (entErr) {
      console.error("[helpbot-graph-query] Error matching entities:", entErr);
    }

    const entityLabels = entities?.map((e: any) => e.label) ?? [];
    console.log(`[helpbot-graph-query] Found ${entityLabels.length} relevant entities:`, entityLabels);

    // 3️⃣ Get graph context (entity relationships)
    let graphContext: any[] = [];
    if (entityLabels.length > 0) {
      const { data: graphCtx, error: graphErr } = await sb.rpc("get_graph_context", {
        p_entity_labels: entityLabels,
        p_limit: 10
      });

      if (graphErr) {
        console.error("[helpbot-graph-query] Error getting graph context:", graphErr);
      } else {
        graphContext = graphCtx ?? [];
      }
    }

    console.log(`[helpbot-graph-query] Retrieved ${graphContext.length} graph relationships`);

    // 4️⃣ Get hybrid RAG context (entities + chunks)
    const { data: hybridCtx, error: hybridErr } = await sb.rpc("get_hybrid_rag_context", {
      p_query_vec: queryEmb,
      p_entity_limit: 5,
      p_chunk_limit: 5
    });

    if (hybridErr) {
      console.error("[helpbot-graph-query] Error getting hybrid context:", hybridErr);
    }

    // 5️⃣ Build context string
    const contextParts: string[] = [];

    // Add graph relationships
    if (graphContext.length > 0) {
      contextParts.push("=== Knowledge Graph Context ===");
      graphContext.forEach(r => {
        contextParts.push(`${r.entity} [${r.relation}] ${r.neighbor} (weight: ${r.weight})`);
      });
    }

    // Add hybrid RAG context
    if (hybridCtx && hybridCtx.length > 0) {
      contextParts.push("\n=== Document & Entity Context ===");
      hybridCtx.forEach((c: any) => {
        contextParts.push(`[${c.source_type}] ${c.content}`);
      });
    }

    const context = contextParts.join("\n");

    if (!context.trim()) {
      const noAnswerMsg = lang === "en"
        ? "I couldn't find relevant information to answer your question."
        : lang === "sv"
        ? "Jag kunde inte hitta relevant information för att besvara din fråga."
        : "Ich konnte keine relevanten Informationen finden, um Ihre Frage zu beantworten.";

      return json({
        ok: true,
        answer: noAnswerMsg,
        context_count: 0,
        entities: [],
        sources: [],
        disclaimer: getDisclaimer(lang)
      });
    }

    // 6️⃣ Generate system prompt
    const systemPrompt = lang === "sv"
      ? "Du är en expertassistent för compliance och juridisk rådgivning. Använd både dokumentfragment och semantiska relationer från kunskapsgrafen för att ge ett korrekt, välgrundat svar. Svara alltid på svenska. Du är inte advokat och ger ingen juridisk rådgivning."
      : lang === "en"
      ? "You are a compliance assistant for legal guidance. Use both document chunks and semantic graph relations to form an accurate, well-founded answer. Always answer in English. You are not a lawyer and do not provide legal advice."
      : "Du bist ein Compliance-Assistent für rechtliche Beratung. Nutze sowohl Dokumentfragmente als auch semantische Relationen aus dem Wissensgraphen, um eine präzise, fundierte Antwort zu formulieren. Antworte immer auf Deutsch. Du bist kein Anwalt und gibst keine Rechtsberatung.";

    // 7️⃣ Generate answer using AI
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
          { role: "user", content: `Frage:\n${query}\n\nKontext:\n${context}` }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[helpbot-graph-query] AI error:", data);
      throw new Error(data?.error?.message ?? "AI request failed");
    }

    const answer = data.choices[0].message.content;

    // 8️⃣ Extract sources from hybrid context
    const sources = hybridCtx
      ?.filter((c: any) => c.source_type === "chunk")
      .map((c: any) => ({ title: "Document", uri: "#" })) ?? [];

    console.log(`[helpbot-graph-query] Generated answer (${answer.length} chars)`);

    return json({
      ok: true,
      answer,
      context_count: contextParts.length,
      entities: entityLabels,
      sources,
      disclaimer: getDisclaimer(lang)
    });
  } catch (e: any) {
    console.error("[helpbot-graph-query] Error:", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
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

function getDisclaimer(lang: string): string {
  if (lang === "en") {
    return "This information is for guidance only and does not constitute legal advice.";
  } else if (lang === "sv") {
    return "Denna information är endast vägledning och utgör inte juridisk rådgivning.";
  } else {
    return "Diese Information dient nur zur Orientierung und stellt keine Rechtsberatung dar.";
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
