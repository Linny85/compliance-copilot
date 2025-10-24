import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MODEL = "gpt-4o-mini";

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

    const { relation_id, lang = "de" } = await req.json();

    if (!relation_id) {
      return json({ error: "relation_id is required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[helpbot-graph-learn] Processing relation ${relation_id}`);

    // 1️⃣ Aktuelle Relation + Entitäten holen
    const { data: relations, error: relErr } = await sb
      .from("helpbot_relations")
      .select(`
        *,
        source_entity:source(id, label, type),
        target_entity:target(id, label, type)
      `)
      .eq("id", relation_id);

    if (relErr) {
      console.error("[helpbot-graph-learn] Error fetching relation:", relErr);
      throw relErr;
    }

    if (!relations || relations.length === 0) {
      return json({ error: "Relation not found" }, 404);
    }

    const rel = relations[0];
    const sourceLabel = (rel.source_entity as any)?.label;
    const targetLabel = (rel.target_entity as any)?.label;
    const relationType = rel.relation;

    console.log(`[helpbot-graph-learn] Analyzing: ${sourceLabel} [${relationType}] ${targetLabel}`);

    // 2️⃣ Semantische Begründung erzeugen
    const systemPrompt = lang === "en"
      ? "You are a legal reasoning assistant. Analyze legal and compliance relationships and explain their implications."
      : lang === "sv"
      ? "Du är en juridisk resoneringsassistent. Analysera juridiska och efterlevnadsrelationer och förklara deras implikationer."
      : "Du bist ein juristischer Reasoning-Assistent. Analysiere rechtliche und Compliance-Beziehungen und erkläre deren Implikationen.";

    const userPrompt = lang === "en"
      ? `Analyze the legal or conceptual relation:\nSource: ${sourceLabel}\nRelation: ${relationType}\nTarget: ${targetLabel}\n\nExplain what this relation implies in a compliance context. Also suggest any additional inferred relations that logically follow.\n\nReturn JSON: {"reasoning": "...", "inferred_relations": [{"source":"...","target":"...","relation":"..."}]}`
      : lang === "sv"
      ? `Analysera den juridiska eller konceptuella relationen:\nKälla: ${sourceLabel}\nRelation: ${relationType}\nMål: ${targetLabel}\n\nFörklara vad denna relation innebär i ett efterlevnadssammanhang. Föreslå även ytterligare härledda relationer som logiskt följer.\n\nReturnera JSON: {"reasoning": "...", "inferred_relations": [{"source":"...","target":"...","relation":"..."}]}`
      : `Analysiere die rechtliche oder konzeptuelle Beziehung:\nQuelle: ${sourceLabel}\nBeziehung: ${relationType}\nZiel: ${targetLabel}\n\nErkläre, was diese Beziehung im Compliance-Kontext bedeutet. Schlage auch zusätzliche abgeleitete Beziehungen vor, die logisch folgen.\n\nGib JSON zurück: {"reasoning": "...", "inferred_relations": [{"source":"...","target":"...","relation":"..."}]}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[helpbot-graph-learn] OpenAI error:", data);
      throw new Error(data?.error?.message ?? "Inference failed");
    }

    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch (parseErr) {
      console.error("[helpbot-graph-learn] Failed to parse reasoning:", parseErr);
      return json({ error: "Failed to parse reasoning" }, 500);
    }

    const reasoning = parsed.reasoning ?? "No reasoning available.";
    const inferredRelations = parsed.inferred_relations ?? [];

    console.log(`[helpbot-graph-learn] Reasoning: ${reasoning.substring(0, 100)}...`);
    console.log(`[helpbot-graph-learn] Found ${inferredRelations.length} inferred relations`);

    // 3️⃣ Inferenz loggen
    const { error: logErr } = await sb
      .from("helpbot_inference_logs")
      .insert({
        entity_source: rel.source,
        entity_target: rel.target,
        reasoning
      });

    if (logErr) {
      console.error("[helpbot-graph-learn] Error logging inference:", logErr);
    }

    // 4️⃣ Neue Relationen aus Inferenz einfügen
    let inferredCount = 0;

    for (const rln of inferredRelations) {
      if (!rln.source || !rln.target || !rln.relation) continue;

      // Find source entity
      const { data: srcEntity } = await sb
        .from("helpbot_entities")
        .select("id")
        .eq("label", rln.source)
        .maybeSingle();

      // Find target entity
      const { data: tgtEntity } = await sb
        .from("helpbot_entities")
        .select("id")
        .eq("label", rln.target)
        .maybeSingle();

      if (!srcEntity || !tgtEntity) {
        console.warn(`[helpbot-graph-learn] Skipping inferred relation - entities not found: ${rln.source} -> ${rln.target}`);
        continue;
      }

      // Check if relation already exists
      const { data: existingRel } = await sb
        .from("helpbot_relations")
        .select("id")
        .eq("source", srcEntity.id)
        .eq("target", tgtEntity.id)
        .eq("relation", rln.relation)
        .maybeSingle();

      if (!existingRel) {
        const { error: insertErr } = await sb
          .from("helpbot_relations")
          .insert({
            source: srcEntity.id,
            target: tgtEntity.id,
            relation: rln.relation,
            weight: 0.6,
            inferred: true,
            support_count: 0
          });

        if (insertErr) {
          console.error(`[helpbot-graph-learn] Error inserting inferred relation:`, insertErr);
        } else {
          inferredCount++;
        }
      }
    }

    console.log(`[helpbot-graph-learn] Completed: ${inferredCount} new inferred relations created`);

    return json({
      ok: true,
      reasoning,
      inferred: inferredCount,
      total_suggested: inferredRelations.length
    });
  } catch (e: any) {
    console.error("[helpbot-graph-learn] Error:", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
