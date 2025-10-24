import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const CHAT_MODEL = Deno.env.get("MODEL") ?? "google/gemini-2.5-flash";
const EMB_MODEL = Deno.env.get("EMB_MODEL") ?? "text-embedding-3-small";
const EMB_DIMENSIONS = Number(Deno.env.get("EMB_DIMENSIONS") ?? "1536");
const TOP_K = Number(Deno.env.get("HELPBOT_TOP_K") ?? "6");
const THRESH = Number(Deno.env.get("HELPBOT_SIM_THRESHOLD") ?? "0.35");

function logProvider() {
  console.log(`[AI Provider] ${PROVIDER.toUpperCase()} → ${BASE_URL}`);
}
logProvider();

type QueryReq = {
  question: string;
  lang?: "de"|"en"|"sv";
  jurisdiction?: string;
  doc_types?: ("law"|"guideline"|"product-doc")[];
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
    const body = (await req.json()) as QueryReq;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const qVec = await embed(body.question);

    // Filter dynamisch (optional)
    const filters: string[] = [];
    if (body.jurisdiction) filters.push(`d.jurisdiction = '${escapeSql(body.jurisdiction)}'`);
    if (body.lang)         filters.push(`d.lang = '${escapeSql(body.lang)}'`);
    if (body.doc_types?.length) filters.push(
      `d.doc_type = any('{${body.doc_types.map(escapeSql).join(",")}}')`
    );
    const where = filters.length ? `where ${filters.join(" and ")}` : "";

    const { data: rows, error: qErr } = await sb.rpc("helpbot_search_chunks", {
      query_vec: qVec,
      limit_k: TOP_K,
      where_sql: where
    });
    if (qErr) throw qErr;

    const matches = (rows ?? []).filter((r: any) => Number(r.sim) <= THRESH);
    if (!matches.length) {
      return json({
        answer: noAnswer(body.lang ?? "de"),
        sources: [],
        disclaimer: disclaimer(body.lang ?? "de"),
      });
    }

    const context = matches.map((r: any, i: number) =>
      `[[DOC ${i+1} | ${r.title} | ${r.source_uri}]]\n${r.content}`
    ).join("\n\n---\n\n");

    const sys = systemPrompt(body.lang ?? "de");
    const prompt =
      `Frage: ${body.question}\n\n` +
      `Beantworte NUR anhand des folgenden Kontextes. Wenn etwas nicht im Kontext steht, sag offen, dass es fehlt.\n` +
      `Kontext:\n${context}`;

    const answer = await chat(sys, prompt);

    const sources = matches.map((r: any) => ({ title: r.title, uri: r.source_uri }));

    return json({ answer, sources, disclaimer: disclaimer(body.lang ?? "de") });
  } catch (e: any) {
    console.error("[helpbot-query]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b:any, status=200) {
  return new Response(JSON.stringify(b), { status, headers: { "Content-Type":"application/json" } });
}
function escapeSql(s:string){ return s.replace(/'/g,"''"); }

async function embed(text: string) {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${API_KEY}` },
    body: JSON.stringify({ model: EMB_MODEL, input: text, dimensions: EMB_DIMENSIONS })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error?.message ?? "Embedding failed");
  return j.data[0].embedding as number[];
}

async function chat(system: string, user: string) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages: [{ role:"system", content: system }, { role:"user", content: user }]
    })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error?.message ?? "Chat failed");
  return j.choices?.[0]?.message?.content ?? "";
}

function systemPrompt(lang: string) {
  return `Rolle: Compliance Supportberater (kein Anwalt).
Regeln:
- Antworte nur anhand der gelieferten Quellen.
- Fehlende/unklare Punkte klar benennen.
- Schritt-für-Schritt, präzise, sachlich; keine Marketingsprache.
- Immer Quellen angeben (siehe UI-Mapping).
- Keine Rechtsberatung.`;
}

function disclaimer(lang: string) {
  if (lang === "en") return "Note: not legal advice. Answers are based only on the provided sources.";
  if (lang === "sv") return "Obs: ingen juridisk rådgivning. Svaren bygger endast på de tillhandahållna källorna.";
  return "Hinweis: keine Rechtsberatung. Antworten basieren ausschließlich auf den bereitgestellten Quellen.";
}

function noAnswer(lang: string) {
  if (lang === "en") return "I couldn't find a reliable source for that in my knowledge base.";
  if (lang === "sv") return "Jag hittade ingen tillförlitlig källa för detta i kunskapsbasen.";
  return "Dafür habe ich in meinen Quellen keine belastbare Stelle gefunden.";
}
