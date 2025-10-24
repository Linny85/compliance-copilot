import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_MB = Number(Deno.env.get("HELPBOT_MAX_UPLOAD_MB") ?? "20");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Simple text extraction from PDF using native Deno capabilities
// For production, consider using a more robust PDF parser
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // This is a simplified approach - in production you'd want a proper PDF parser
  // For now, we'll attempt basic text extraction
  try {
    const uint8Array = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(uint8Array);
    
    // Basic PDF text extraction (looks for text between stream/endstream tags)
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    const matches = [...text.matchAll(streamRegex)];
    
    let extractedText = '';
    for (const match of matches) {
      extractedText += match[1] + '\n';
    }
    
    // Clean up extracted text
    extractedText = extractedText
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error("Could not extract sufficient text from PDF. Please ensure the PDF contains searchable text.");
    }
    
    return extractedText;
  } catch (e) {
    console.error("[PDF extraction error]", e);
    throw new Error(`Failed to extract text from PDF: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const form = await req.formData();
    const file = form.get("file") as File;
    const jurisdiction = form.get("jurisdiction")?.toString()?.trim() ?? "EU";
    const lang = form.get("lang")?.toString()?.trim() ?? "de";
    const doc_type = form.get("doc_type")?.toString()?.trim() ?? "law";

    // Input validation
    if (!file) {
      throw new Error("No file uploaded");
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error("Only PDF files are supported");
    }
    
    if (file.size > MAX_MB * 1024 * 1024) {
      throw new Error(`File exceeds ${MAX_MB} MB limit`);
    }

    // Validate jurisdiction
    const validJurisdictions = ['EU', 'DE', 'SE', 'NO', 'FI', 'DK', 'IS'];
    if (!validJurisdictions.includes(jurisdiction)) {
      throw new Error(`Invalid jurisdiction. Must be one of: ${validJurisdictions.join(', ')}`);
    }

    // Validate lang
    const validLangs = ['de', 'en', 'sv', 'no', 'fi', 'da', 'is'];
    if (!validLangs.includes(lang)) {
      throw new Error(`Invalid language. Must be one of: ${validLangs.join(', ')}`);
    }

    // Validate doc_type
    const validDocTypes = ['law', 'guideline', 'product-doc'];
    if (!validDocTypes.includes(doc_type)) {
      throw new Error(`Invalid doc_type. Must be one of: ${validDocTypes.join(', ')}`);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    
    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    
    // Compute SHA-256 checksum
    const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const file_sha256 = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Check if file already exists
    const { data: existing } = await sb
      .from("helpbot_docs")
      .select("id")
      .eq("file_sha256", file_sha256)
      .maybeSingle();
    
    if (existing) {
      // Check if chunks exist for this document
      const { count } = await sb
        .from("helpbot_chunks")
        .select("*", { count: "exact", head: true })
        .eq("doc_id", existing.id);

      // If no chunks exist, force re-ingest
      if (!count || count === 0) {
        console.log(`[Re-ingest] Doc ${existing.id} has no chunks, forcing ingest`);
        const text = await extractTextFromPDF(arrayBuffer);
        
        const { data: ingestData, error: ingestErr } = await sb.functions.invoke("helpbot-ingest", {
          body: {
            title: file.name.replace(/\.pdf$/i, ""),
            text,
            source_uri: null,
            jurisdiction,
            doc_type,
            lang,
            version: new Date().toISOString().slice(0, 10),
            file_sha256,
          },
        });

        if (ingestErr) {
          console.error("[Re-ingest error]", ingestErr);
          throw new Error(`Re-ingest failed: ${ingestErr.message}`);
        }

        return json({ 
          ok: true, 
          dedup: true, 
          reingest: true,
          doc_id: existing.id,
          ingested: ingestData
        });
      }

      return json({ ok: true, dedup: true, doc_id: existing.id, chunks_ok: true });
    }
    
    const text = await extractTextFromPDF(arrayBuffer);

    // Upload to storage
    const fileName = `${crypto.randomUUID()}.pdf`;
    const { data: upload, error: upErr } = await sb.storage
      .from("helpbot-sources")
      .upload(fileName, file, {
        contentType: "application/pdf",
        upsert: false,
      });
    
    if (upErr) {
      console.error("[Storage upload error]", upErr);
      throw new Error(`Storage upload failed: ${upErr.message}`);
    }

    // Ingest via helpbot-ingest function
    const { data, error } = await sb.functions.invoke("helpbot-ingest", {
      body: {
        title: file.name.replace(/\.pdf$/i, ""),
        text,
        source_uri: upload?.path ? `storage://helpbot-sources/${upload.path}` : null,
        jurisdiction,
        doc_type,
        lang,
        version: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        file_sha256,
      },
    });
    
    if (error) {
      console.error("[Ingest error]", error);
      throw new Error(`Ingest failed: ${error.message}`);
    }

    return json({ 
      ok: true, 
      uploaded: upload?.path, 
      ingested: data,
      textLength: text.length 
    });
  } catch (e: any) {
    console.error("[helpbot-upload]", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
