import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const EMB_MODEL = Deno.env.get("HELPBOT_EMBED_MODEL") ?? "text-embedding-3-small";

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
      embedding: embeddings[i] as any
    }));
    const { error: insErr } = await sb.from("helpbot_chunks")
      .upsert(rows, { onConflict: 'doc_id,chunk_no' });
    if (insErr) throw insErr;

    return json({ ok: true, doc_id: doc.id, chunks: rows.length });
  } catch (e: any) {
    console.error("[helpbot-ingest]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
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

async function embedBatch(chunks: string[]) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMB_MODEL, input: chunks })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error?.message ?? "Embedding failed");
  return j.data.map((d: any) => d.embedding);
}
