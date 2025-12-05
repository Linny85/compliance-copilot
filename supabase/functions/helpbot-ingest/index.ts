import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embedBatch, getAiProviderInfo } from "../_shared/aiClient.ts";

console.log('[helpbot-ingest boot]', getAiProviderInfo());

type IngestReq = {
  title: string;
  text: string;
  source_uri?: string;
  jurisdiction?: string;
  doc_type?: "law" | "guideline" | "product-doc";
  version?: string;
  lang?: "de" | "en" | "sv";
  file_sha256?: string;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
    const body = (await req.json()) as IngestReq;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Metadaten anlegen
    const { data: doc, error: docErr } = await sb.from("helpbot_docs")
      .insert({
        title: body.title,
        source_uri: body.source_uri ?? "storage://helpbot-sources/",
        jurisdiction: body.jurisdiction ?? null,
        doc_type: body.doc_type ?? "product-doc",
        version: body.version ?? null,
        lang: body.lang ?? "de",
        file_sha256: body.file_sha256 ?? null,
      })
      .select("*").single();
    if (docErr) throw docErr;

    // 2) Chunking (einfach, paragraph-basiert)
    const chunks = chunkText(body.text, 1500);

    // 3) Embeddings abrufen
    const embeddings = await embedBatch(chunks);

    // 4) Speichern (mit upsert für Chunk-Dedupe)
    const rows = chunks.map((c, i) => ({
      doc_id: doc.id,
      chunk_no: i,
      content: c,
      tokens: null,
      embedding: embeddings[i]
    }));
    const { error: insErr } = await sb.from("helpbot_chunks")
      .upsert(rows, { onConflict: 'doc_id,chunk_no' });
    if (insErr) throw insErr;

    return json({ ok: true, doc_id: doc.id, chunks: rows.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[helpbot-ingest]", error);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function chunkText(text: string, maxLen = 1500) {
  const paras = text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
  const out: string[] = []; let buf = "";
  for (const p of paras) {
    const next = buf ? buf + "\n\n" + p : p;
    if (next.length > maxLen && buf) { out.push(buf); buf = p; }
    else buf = next;
  }
  if (buf) out.push(buf);
  return out;
}

