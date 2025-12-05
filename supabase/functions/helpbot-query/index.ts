import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embed, chat, getAiProviderInfo } from "../_shared/aiClient.ts";

console.log('[helpbot-query boot]', getAiProviderInfo());

const TOP_K = Number(Deno.env.get("HELPBOT_TOP_K") ?? "6");
const THRESH = Number(Deno.env.get("HELPBOT_SIM_THRESHOLD") ?? "0.35");

type QueryReq = {
  question: string;
  lang?: "de"|"en"|"sv";
  jurisdiction?: string;
  doc_types?: ("law"|"guideline"|"product-doc")[];
};

type SearchRow = {
  sim: number | string;
  title?: string;
  source_uri?: string;
  content?: string;
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

    const matches = ((rows ?? []) as SearchRow[]).filter((row) => Number(row.sim) <= THRESH);
    if (!matches.length) {
      return json({
        answer: noAnswer(body.lang ?? "de"),
        sources: [],
        disclaimer: disclaimer(body.lang ?? "de"),
      });
    }

    const context = matches.map((row, i) =>
      `[[DOC ${i + 1} | ${row.title} | ${row.source_uri}]]\n${row.content}`
    ).join("\n\n---\n\n");

    const sys = systemPrompt(body.lang ?? "de");
    const prompt =
      `Frage: ${body.question}\n\n` +
      `Beantworte NUR anhand des folgenden Kontextes. Wenn etwas nicht im Kontext steht, sag offen, dass es fehlt.\n` +
      `Kontext:\n${context}`;

    const answer = await chat([
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ]);

    const sources = matches.map((row) => ({ title: row.title, uri: row.source_uri }));

    return json({ answer, sources, disclaimer: disclaimer(body.lang ?? "de") });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[helpbot-query]", error);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status=200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type":"application/json" } });
}
function escapeSql(s:string){ return s.replace(/'/g,"''"); }

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
