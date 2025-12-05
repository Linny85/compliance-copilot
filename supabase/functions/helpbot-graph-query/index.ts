import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { embed, chat, getAiProviderInfo } from "../_shared/aiClient.ts";

console.log('[helpbot-graph-query boot]', getAiProviderInfo());

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type EntityMatch = { label?: string };
type GraphContextEntry = { entity: string; neighbor: string; relation: string; weight?: number };
type HybridContextEntry = { source_type?: string; content?: string };

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

    const entityLabels = ((entities ?? []) as EntityMatch[])
      .map((entity) => entity.label)
      .filter((label): label is string => Boolean(label));
    console.log(`[helpbot-graph-query] Found ${entityLabels.length} relevant entities:`, entityLabels);

    // 3️⃣ Get graph context (entity relationships)
    let graphContext: GraphContextEntry[] = [];
    if (entityLabels.length > 0) {
      const { data: graphCtx, error: graphErr } = await sb.rpc("get_graph_context", {
        p_entity_labels: entityLabels,
        p_limit: 10
      });

      if (graphErr) {
        console.error("[helpbot-graph-query] Error getting graph context:", graphErr);
      } else {
        graphContext = (graphCtx ?? []) as GraphContextEntry[];
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
    const hybridContext = (hybridCtx ?? []) as HybridContextEntry[];

    // 5️⃣ Build context string
    const contextParts: string[] = [];

    // Add graph relationships
    if (graphContext.length > 0) {
      contextParts.push("=== Knowledge Graph Context ===");
      graphContext.forEach((relation) => {
        contextParts.push(`${relation.entity} [${relation.relation}] ${relation.neighbor} (weight: ${relation.weight ?? 1})`);
      });
    }

    // Add hybrid RAG context
    if (hybridContext.length > 0) {
      contextParts.push("\n=== Document & Entity Context ===");
      hybridContext.forEach((contextEntry) => {
        contextParts.push(`[${contextEntry.source_type}] ${contextEntry.content}`);
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
    const answer = await chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Frage:\n${query}\n\nKontext:\n${context}` }
    ]);

    // 8️⃣ Extract sources from hybrid context
    const sources = hybridContext
      .filter((contextEntry) => contextEntry.source_type === "chunk")
      .map(() => ({ title: "Document", uri: "#" }));

    console.log(`[helpbot-graph-query] Generated answer (${answer.length} chars)`);

    return json({
      ok: true,
      answer,
      context_count: contextParts.length,
      entities: entityLabels,
      sources,
      disclaimer: getDisclaimer(lang)
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[helpbot-graph-query] Error:", error);
    return json({ error: message }, 500);
  }
});

function getDisclaimer(lang: string): string {
  if (lang === "en") {
    return "This information is for guidance only and does not constitute legal advice.";
  } else if (lang === "sv") {
    return "Denna information är endast vägledning och utgör inte juridisk rådgivning.";
  } else {
    return "Diese Information dient nur zur Orientierung und stellt keine Rechtsberatung dar.";
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
