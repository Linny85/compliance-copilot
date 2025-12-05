import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { chatCompletion, embed } from "../_shared/aiClient.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GRAPH_MODEL = Deno.env.get("HELPBOT_GRAPH_MODEL") ?? Deno.env.get("MODEL") ?? "gpt-4.1-mini";
const EMB_DIM_VALUE = Number(Deno.env.get("EMB_DIMENSIONS") ?? "0");
const EMBED_OPTIONS = EMB_DIM_VALUE > 0 ? { dimensions: EMB_DIM_VALUE } : undefined;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const { message_id, content, lang = "de" } = await req.json();

    if (!message_id || !content) {
      return json({ error: "message_id and content are required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[helpbot-graph-extract] Extracting entities from message ${message_id} (${lang})`);

    // 1️⃣ AI-Extraktion: Entitäten + Beziehungen
    const systemPrompt = lang === "en"
      ? "You are an entity extraction assistant. Identify legal or thematic entities and their relationships in the following text. Return JSON: {\"entities\":[{\"label\":\"...\",\"type\":\"...\",\"description\":\"...\"}],\"relations\":[{\"source\":\"...\",\"target\":\"...\",\"relation\":\"...\"}]} Types: law, article, concept, organization, topic. Relations: refers_to, explains, derived_from, contradicts, same_as."
      : lang === "sv"
      ? "Du är en entitetsextraktionsassistent. Identifiera juridiska eller tematiska entiteter och deras relationer i följande text. Returnera JSON: {\"entities\":[{\"label\":\"...\",\"type\":\"...\",\"description\":\"...\"}],\"relations\":[{\"source\":\"...\",\"target\":\"...\",\"relation\":\"...\"}]} Typer: law, article, concept, organization, topic. Relationer: refers_to, explains, derived_from, contradicts, same_as."
      : "Du bist ein Entitätsextraktionsassistent. Erkenne juristische oder thematische Entitäten und deren Beziehungen im folgenden Text. Antworte als JSON: {\"entities\":[{\"label\":\"...\",\"type\":\"...\",\"description\":\"...\"}],\"relations\":[{\"source\":\"...\",\"target\":\"...\",\"relation\":\"...\"}]} Typen: law, article, concept, organization, topic. Relationen: refers_to, explains, derived_from, contradicts, same_as.";

    const completion = await chatCompletion({
      model: GRAPH_MODEL,
      responseFormat: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ]
    });

    let extractedData;
    try {
      extractedData = JSON.parse(completion.content);
    } catch (parseErr) {
      console.error("[helpbot-graph-extract] Failed to parse JSON:", parseErr);
      return json({ ok: true, entities: 0, relations: 0, warning: "Failed to parse extraction result" });
    }

    const { entities = [], relations = [] } = extractedData;

    console.log(`[helpbot-graph-extract] Extracted ${entities.length} entities, ${relations.length} relations`);

    // 2️⃣ Einfügen / Aktualisieren von Entitäten
    const entityMap = new Map<string, string>(); // label -> id

    for (const e of entities) {
      if (!e.label) continue;

      const embedding = await embed(e.label, EMBED_OPTIONS);

      // Check if entity already exists
      const { data: existing } = await sb
        .from("helpbot_entities")
        .select("id")
        .eq("label", e.label)
        .eq("lang", lang)
        .maybeSingle();

      let entity_id: string;

      if (existing) {
        entity_id = existing.id;
      } else {
        const { data: inserted, error: insertErr } = await sb
          .from("helpbot_entities")
          .insert({
            label: e.label,
            type: e.type || "concept",
            lang,
            description: e.description || null,
            embedding
          })
          .select("id")
          .single();

        if (insertErr) {
          console.error(`[helpbot-graph-extract] Error inserting entity ${e.label}:`, insertErr);
          continue;
        }

        entity_id = inserted.id;
      }

      entityMap.set(e.label, entity_id);

      // Link entity to message
      const { error: linkErr } = await sb
        .from("helpbot_entity_links")
        .insert({
          message_id,
          entity_id,
          confidence: 0.8
        });

      if (linkErr) {
        console.error(`[helpbot-graph-extract] Error linking entity ${e.label}:`, linkErr);
      }
    }

    // 3️⃣ Beziehungen speichern
    let relationsCreated = 0;

    for (const rln of relations) {
      if (!rln.source || !rln.target || !rln.relation) continue;

      const sourceId = entityMap.get(rln.source);
      const targetId = entityMap.get(rln.target);

      if (!sourceId || !targetId) {
        console.warn(`[helpbot-graph-extract] Skipping relation - entities not found: ${rln.source} -> ${rln.target}`);
        continue;
      }

      // Check if relation already exists
      const { data: existingRel } = await sb
        .from("helpbot_relations")
        .select("id")
        .eq("source", sourceId)
        .eq("target", targetId)
        .eq("relation", rln.relation)
        .maybeSingle();

      if (!existingRel) {
        const { error: relErr } = await sb
          .from("helpbot_relations")
          .insert({
            source: sourceId,
            target: targetId,
            relation: rln.relation,
            weight: rln.weight || 1.0
          });

        if (relErr) {
          console.error(`[helpbot-graph-extract] Error creating relation:`, relErr);
        } else {
          relationsCreated++;
        }
      }
    }

    console.log(`[helpbot-graph-extract] Completed: ${entityMap.size} entities, ${relationsCreated} relations created`);

    return json({
      ok: true,
      entities: entityMap.size,
      relations: relationsCreated
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[helpbot-graph-extract] Error:", error);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
