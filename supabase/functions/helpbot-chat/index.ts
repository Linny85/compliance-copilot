// Kollege Norrly - Hardened AI Compliance Assistant
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OFFLINE_MODE = !LOVABLE_API_KEY;

// Helper functions
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const err = (message: string, reqId: string, status = 400) => 
  json({ 
    ok: false, 
    error: message, 
    message,
    text: message,
    content: message,
    choices: [{ index: 0, message: { role: "assistant", content: message }, finish_reason: "error" }],
    reqId 
  }, status);

// Success envelope with multiple schema compatibility
function successEnvelope(params: {
  sessionId: string;
  answer: string;
  history?: any[];
  reqId?: string;
  provider?: string;
  agent?: any;
  sources?: any[];
}) {
  const { 
    sessionId, 
    answer, 
    history = [], 
    reqId = crypto.randomUUID(), 
    provider = "LOVABLE_AI", 
    agent,
    sources = []
  } = params;

  // OpenAI-compatible block
  const openaiLike = {
    id: reqId,
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: answer },
        finish_reason: "stop",
      },
    ],
  };

  return {
    ok: true,
    provider,
    session_id: sessionId,
    agent: agent ?? undefined,
    
    // Primary fields
    answer,
    history,
    sources,
    
    // Common aliases for UI compatibility
    message: answer,
    text: answer,
    content: answer,
    assistant_message: answer,
    
    // OpenAI-compatible (for UIs expecting this format)
    ...openaiLike,
    
    reqId,
  };
}

// === Typen & Sprache ===
type Lang = "de" | "en" | "sv";
const VALID_LANGS: readonly Lang[] = ["de", "en", "sv"] as const;
function normalizeLang(input?: string): Lang {
  const two = (input ?? "de").toLowerCase().slice(0, 2);
  return (VALID_LANGS as readonly string[]).includes(two) ? (two as Lang) : "de";
}

// === Agent Metadaten ===
const AGENT = {
  name: "NORRLY",
  description: "Compliance-Kollege im NIS2 AI Guard",
  avatar: "🤖"
};

// INTRO deaktiviert – Begrüßung erfolgt jetzt ausschließlich über System-Prompt
const INTRO: Record<Lang, string> = {
  de: "",
  en: "",
  sv: "",
};

// === System Prompts ===
// DEAKTIVIERT – nur noch der Kollegial-Prompt ab Zeile 722+ wird verwendet

// === Offline Fallback Generator ===
function offlineFallbackAnswer(q: string, lang: Lang): string {
  const RES = {
    de: {
      head: "🔒 Offline-Antwort (ohne KI)",
      body: "Ich gebe dir eine klare, praxisnahe Einschätzung und verlinke offizielle Quellen.",
      tip: "Norrly-Tipp: Formuliere Verantwortlichkeiten (wer macht was bis wann?) und dokumentiere Entscheidungen kurz im Risikoregister.",
      src: "📚 Quellen: NIS2 (EUR-Lex), EU AI Act (Amtsblatt/konsolidiert), ENISA, EU-Kommission",
    },
    en: {
      head: "🔒 Offline response (no AI)",
      body: "Here's a clear, practical assessment with official sources.",
      tip: "Norrly tip: Assign owners and deadlines, and log decisions in the risk register.",
      src: "📚 Sources: NIS2 (EUR-Lex), EU AI Act (OJ/consolidated), ENISA, EU Commission",
    },
    sv: {
      head: "🔒 Offline-svar (utan AI)",
      body: "Här är en tydlig, praktisk bedömning med officiella källor.",
      tip: "Norrly-tips: Sätt ansvar och tidsfrister och logga beslut i riskregistret.",
      src: "📚 Källor: NIS2 (EUR-Lex), EU AI Act (EUT/konsoliderad), ENISA, EU-kommissionen",
    },
  }[lang];

  const isNis2 = /nis2/i.test(q);
  const isAi   = /\b(ai act|art\.?\s*\d+|artikel\s*\d+|ki)\b/i.test(q);
  const isGdpr = /\b(gdpr|dsgvo)\b/i.test(q);
  const isDora = /\bdora\b/i.test(q);

  const bullets: string[] = [];
  if (isNis2) bullets.push(lang === "de"
    ? "NIS2: Prüfe, ob ihr **Essential** oder **Important Entity** seid; setze Kernmaßnahmen (Risikomanagement, Vorfälle ≤24 h melden, Lieferkettenkontrollen)."
    : lang === "sv"
    ? "NIS2: Kontrollera om ni är **Essential** eller **Important Entity**; införa kärnåtgärder (riskhantering, incidentrapport ≤24 h, leverantörskontroller)."
    : "NIS2: Check if you are an **Essential** or **Important Entity**; implement core measures (risk mgmt, incident reporting ≤24h, supplier controls).");

  if (isAi) bullets.push(lang === "de"
    ? "EU AI Act: Ordne das System (z. B. **Hochrisiko**), führe Risikomanagement/Monitoring, Daten-Governance, Logging und Nutzerhinweise durch."
    : lang === "sv"
    ? "EU AI Act: Klassificera systemet (t.ex. **högrisk**), gör riskhantering/övervakning, datastyrning, loggning och användarinformation."
    : "EU AI Act: Classify the system (e.g., **high-risk**), do risk mgmt/monitoring, data governance, logging and user notices.");

  if (isGdpr) bullets.push(lang === "de"
    ? "GDPR: Prüfe Rechtsgrundlage, Transparenz, DPIA (falls nötig) und Auftragsverarbeitung mit Anbietern."
    : lang === "sv"
    ? "GDPR: Säkerställ rättslig grund, transparens, DPIA (vid behov) och personuppgiftsbiträdesavtal."
    : "GDPR: Ensure legal basis, transparency, DPIA (if needed) and processor agreements.");

  if (isDora) bullets.push(lang === "de"
    ? "DORA: Für Finanz: IKT-Risiko-Mgmt, Tests, Drittparteiensteuerung, Meldungen."
    : lang === "sv"
    ? "DORA: För finans: IKT-riskhantering, tester, tredjepartsstyrning, rapportering."
    : "DORA: For finance: ICT risk mgmt, testing, third-party oversight, reporting.");

  if (bullets.length === 0) {
    bullets.push(lang === "de"
      ? "Bitte präzisiere kurz (Kontext/Branche/Ziel) – dann gebe ich dir konkrete Schritte mit Quellen."
      : lang === "sv"
      ? "Förtydliga gärna (kontext/bransch/mål) – så ger jag konkreta steg med källor."
      : "Please add a bit of context (sector/goal) and I'll give concrete steps with sources.");
  }

  return `**${RES.head}**\n${RES.body}\n\n${bullets.map(b => "• " + b).join("\n")}\n\n${RES.src}\n\n_${RES.tip}_`;
}

// === DB ===
const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

type ChatRow = { role: "user" | "assistant" | "system"; content: string };
type ChatMsg = { role: 'user' | 'assistant'; content: string };

async function getContext(sessionId: string): Promise<ChatRow[]> {
  try {
    const { data, error } = await sbAdmin
      .from("helpbot_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    return (data ?? []).reverse() as ChatRow[];
  } catch (e) {
    console.warn("[helpbot-chat] context fetch failed", e);
    return [];
  }
}

// === Memory Helpers ===
function roughTokenCount(text: string): number {
  return Math.ceil((text || '').length / 4);
}

async function loadMemory(
  sbAdmin: any,
  userId: string | null,
  module: string,
  locale: string
): Promise<ChatMsg[]> {
  if (!userId) return [];
  const { data, error } = await sbAdmin
    .from('helpbot_memory')
    .select('messages')
    .eq('user_id', userId)
    .eq('module', module)
    .eq('locale', locale)
    .single();
  if (error || !data?.messages) return [];
  return data.messages as ChatMsg[];
}

async function saveMemory(
  sbAdmin: any,
  userId: string | null,
  module: string,
  locale: string,
  append: ChatMsg[],
  tokenBudget = 4000
) {
  if (!userId || append.length === 0) return;

  const { data: existing } = await sbAdmin
    .from('helpbot_memory')
    .select('messages')
    .eq('user_id', userId)
    .eq('module', module)
    .eq('locale', locale)
    .single();

  let merged: ChatMsg[] = Array.isArray(existing?.messages) ? existing!.messages : [];
  merged = [...merged, ...append];

  const flat = merged.map(m => m.content).join('\n');
  let estTokens = roughTokenCount(flat);

  while (estTokens > tokenBudget && merged.length > 2) {
    merged.splice(0, 2);
    estTokens = roughTokenCount(merged.map(m => m.content).join('\n'));
  }

  const upsertRow = {
    user_id: userId,
    module,
    locale,
    messages: merged,
    token_count: estTokens,
    updated_at: new Date().toISOString()
  };

  await sbAdmin
    .from('helpbot_memory')
    .upsert(upsertRow, { onConflict: 'user_id,module,locale' });
}

async function saveMsg(sessionId: string, role: "user" | "assistant", content: string, userId?: string) {
  try {
    const { error } = await sbAdmin.from("helpbot_messages").insert({
      session_id: sessionId,
      role,
      content,
      user_id: userId || null,
    });
    if (error) throw error;
  } catch (e) {
    console.warn("[helpbot-chat] save failed", e);
  }
}

// === Rate Limit (pro SessionId, hart aber simpel) ===
// 30 Requests in 5 Minuten pro Session
async function checkRate(sessionId: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const { data, error } = await sbAdmin
    .from("helpbot_messages")
    .select("id, created_at")
    .eq("session_id", sessionId)
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
  if (error) return { ok: true }; // fail-open, um nicht zu blockieren
  const count = data?.length ?? 0;
  if (count > 30) {
    return { ok: false, retryAfterSec: 60 }; // 1 Minute abkühlen
  }
  return { ok: true };
}

// === Knowledge Context Loader ===
async function getKnowledgeContext(lang: Lang, mod: string, questionHint?: string): Promise<string> {
  try {
    const { data, error } = await sbAdmin
      .from('helpbot_knowledge')
      .select('module, locale, title, content')
      .eq('locale', lang)
      .in('module', [mod, 'global'])
      .order('module', { ascending: true }) // zuerst global, dann spezielles Modul
      .limit(1000);

    if (error) {
      console.error('[helpbot-chat] Knowledge load error:', error);
      return '';
    }
    if (!data || data.length === 0) return '';

    // If questionHint provided, prioritize matching entries
    let prioritizedData = data;
    if (questionHint) {
      const hint = questionHint.toLowerCase();
      const matches = data.filter(r => r.title.toLowerCase().includes(hint));
      const others = data.filter(r => !r.title.toLowerCase().includes(hint));
      prioritizedData = [...matches, ...others];
    }

    // Kurze, modulspezifische Nuggets bauen
    const chunks = prioritizedData.map((r) => `• ${r.title}: ${r.content}`);
    // Kontext begrenzen (ca. 1.5k Zeichen), damit Antworten knackig bleiben
    let ctx = '';
    for (const c of chunks) {
      if ((ctx + '\n' + c).length > 1500) break;
      ctx += (ctx ? '\n' : '') + c;
    }
    return ctx;
  } catch (e) {
    console.warn('[helpbot-chat] getKnowledgeContext failed', e);
    return '';
  }
}

// === Synonym Resolver ===
async function resolveSynonyms(text: string): Promise<string> {
  try {
    const { data } = await sbAdmin.from('helpbot_synonyms').select('term, module');
    if (!data) return text;

    let result = text;
    for (const s of data) {
      const regex = new RegExp(`\\b${s.term}\\b`, 'gi');
      result = result.replace(regex, s.module);
    }
    return result;
  } catch (e) {
    console.warn('[helpbot-chat] resolveSynonyms failed', e);
    return text;
  }
}

// === Legal Guard (entfernt nur konkrete Gesetzeszitate, nicht Produktnamen) ===
function legalGuard(answer: string, userQuestion: string): { answer: string; triggered: boolean; reason: string } {
  const askedForLaw = /\b(gesetz|recht|artikel|art\.|celex|eur-lex|legal|grundlage|quelle|bitte mit artikel|zeig.*artikel)\b/i.test(userQuestion);
  if (askedForLaw) {
    return { answer, triggered: false, reason: 'user_requested_legal' };
  }

  // Entferne NUR harte Gesetzeszitate (Art. 5, Artikel 24, Annex III, etc.) - NICHT Produktnamen wie "NIS2 AI Guard"
  const citationPattern = /\b(Art\.?\s?\d+|Artikel\s?\d+|Annex\s?[IVXLC]+|CELEX:\d+|Erwägungsgrund\s?\d+)\b/gi;
  const hasCitations = citationPattern.test(answer);
  
  if (hasCitations) {
    const cleaned = answer.replace(citationPattern, '[Rechtsgrundlage auf Nachfrage]');
    return { answer: cleaned, triggered: true, reason: 'removed_legal_citations' };
  }
  
  return { answer, triggered: false, reason: 'none' };
}

// === Lovable Chat Call ===
async function chat(
  messages: { role: "system" | "user" | "assistant"; content: string }[], 
  lang: Lang, 
  question: string
): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return offlineFallbackAnswer(question, lang);
  }
  
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.7,
        max_tokens: 1000,
        messages,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lovable AI error ${res.status}: ${t}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    console.error("[helpbot-chat] AI call failed, using fallback", e);
    // Bei Ausfall des Providers: elegant auf Fallback wechseln
    return offlineFallbackAnswer(question, lang);
  }
}

// === Commands ===
const RESOURCES: Record<Lang, string> = {
  de: "📚 **Offizielle Quellen:**\n- NIS2 (EUR-Lex): https://eur-lex.europa.eu/eli/dir/2022/2555/oj\n- EU AI Act (EUR-Lex konsolidiert, sobald verfügbar) + Amtsblatt\n- ENISA: https://www.enisa.europa.eu/\n- EU-Kommission Cybersecurity: https://digital-strategy.ec.europa.eu/en/policies/cybersecurity",
  en: "📚 **Official Sources:**\n- NIS2 (EUR-Lex): https://eur-lex.europa.eu/eli/dir/2022/2555/oj\n- EU AI Act (Official Journal / consolidated when available)\n- ENISA: https://www.enisa.europa.eu/\n- EU Commission Cybersecurity: https://digital-strategy.ec.europa.eu/en/policies/cybersecurity",
  sv: "📚 **Officiella källor:**\n- NIS2 (EUR-Lex): https://eur-lex.europa.eu/eli/dir/2022/2555/oj\n- EU AI Act (Officiell publikation / konsoliderad när tillgänglig)\n- ENISA: https://www.enisa.europa.eu/\n- EU-kommissionen (Cybersäkerhet): https://digital-strategy.ec.europa.eu/en/policies/cybersecurity",
};

const CONTACT: Record<Lang, string> = {
  de: "📧 **Kontakt:**\nFür Unterstützung wenden Sie sich an Ihr Compliance-Team oder support@nis2-ai-guard.eu",
  en: "📧 **Contact:**\nFor support, contact your compliance team or support@nis2-ai-guard.eu",
  sv: "📧 **Kontakt:**\nFör support, kontakta ditt compliance-team eller support@nis2-ai-guard.eu",
};

// === Known Fixes (Pattern Matching für häufige Fehler) ===
type Fix = (lang: Lang) => string;

const KNOWN_FIXES: { test: RegExp; answer: Fix }[] = [
  {
    // CSP / WASM / unsafe-eval
    test: /(Refused to compile|instantiate) WebAssembly|wasm-unsafe-eval|Content Security Policy.+script-src/i,
    answer: (lang: Lang): string => {
      const messages: Record<Lang, string> = {
        de: `**Kurzdiagnose:** Deine CSP blockiert WebAssembly (WASM). Viele SDKs brauchen JIT.  
**Fix (minimal-invasiv):** Füge \`'wasm-unsafe-eval'\` zu \`script-src\` hinzu (ohne \`unsafe-eval\`).  
**CSP-Header:**
\`\`\`
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{NONCE}' 'strict-dynamic' 'wasm-unsafe-eval' https: 'self';
  connect-src 'self' https: wss:;
  img-src 'self' https: data:;
  style-src 'self' 'unsafe-inline' https:;
  font-src 'self' https: data:;
  frame-src 'self' https:;
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
\`\`\`
**Nginx (Beispiel):**
\`\`\`nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'nonce-$request_id' 'strict-dynamic' 'wasm-unsafe-eval' https: 'self';
  connect-src 'self' https: wss:;
  img-src 'self' https: data:;
  style-src 'self' 'unsafe-inline' https:;
  font-src 'self' https: data:;
  frame-src 'self' https:;
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
" always;
\`\`\`
**Verifikation:** Browser-Console neu laden (Strg+Shift+R). Fehler verschwindet.`,
        en: `**Diagnosis:** Your CSP blocks WebAssembly (WASM). Add \`'wasm-unsafe-eval'\` to \`script-src\`.  
**CSP header and Nginx snippet:** See German block above for complete examples.
**Verification:** Reload browser console (Ctrl+Shift+R). Error should disappear.`,
        sv: `**Diagnos:** Din CSP blockerar WASM. Lägg till \`'wasm-unsafe-eval'\` i \`script-src\`.  
**CSP-header och Nginx-snippet:** Se tyska blocket ovan för fullständiga exempel.
**Verifiering:** Ladda om webbläsarkonsolen (Ctrl+Shift+R). Felet försvinner.`,
      };
      return messages[lang];
    },
  },
  {
    // SPA 404 / missing rewrite
    test: /Failed to load resource: the server responded with a status of 404.*\/(controls|billing)|try_files|index\.html/i,
    answer: (lang: Lang): string => {
      const messages: Record<Lang, string> = {
        de: `**Kurzdiagnose:** SPA-Routing ohne Fallback → 404 auf Unterseiten.  
**Fix (Nginx):**
\`\`\`nginx
location / {
  try_files $uri /index.html;
}
\`\`\`
**Check:** Seite /controls direkt aufrufen → sollte index.html laden.`,
        en: `**Diagnosis:** SPA needs rewrite to index.html. 
**Nginx fix:** See snippet in German block above.
**Verification:** Access /controls directly → should load index.html.`,
        sv: `**Diagnos:** SPA behöver rewrite till index.html. 
**Nginx-fix:** Se snippet i tyska blocket ovan.
**Verifiering:** Öppna /controls direkt → bör ladda index.html.`,
      };
      return messages[lang];
    },
  },
  {
    // PostgREST 406/400/401
    test: /rest\/v1\/.*(406|400|401)|Accept:\s*text\/html|missing Accept header/i,
    answer: (lang: Lang): string => {
      const messages: Record<Lang, string> = {
        de: `**Kurzdiagnose:** PostgREST-Header unvollständig oder Spaltenname falsch.  
**Fix:**
- Headers im Browser-Request:
\`\`\`http
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {ACCESS_TOKEN oder SUPABASE_ANON_KEY}
Accept: application/json
\`\`\`
- Prüfe Query-Parameter & Spalten (z. B. \`company_id\` vs \`tenant_id\`).  
**Check:** Request erneut senden → 200/206 erwartet.`,
        en: `**Diagnosis:** PostgREST headers incomplete or column name incorrect.
**Fix:** Set \`Accept: application/json\`, send \`apikey\` and \`Authorization\`. Verify column names.
**Verification:** Resend request → expect 200/206.`,
        sv: `**Diagnos:** PostgREST-headers ofullständiga eller kolumnnamn felaktigt.
**Fix:** Sätt \`Accept: application/json\`, skicka \`apikey\` och \`Authorization\`. Verifiera kolumnnamn.
**Verifiering:** Skicka request igen → förvänta 200/206.`,
      };
      return messages[lang];
    },
  },
  {
    // HMR/WS noise in prod
    test: /WebSocket connection.*failed|dev-server: 404|HMR/i,
    answer: (lang: Lang): string => {
      const messages: Record<Lang, string> = {
        de: `**Kurzdiagnose:** HMR/Dev-WebSocket läuft in Produktion.  
**Fix (Frontend):**
\`\`\`ts
if (import.meta.env.DEV) {
  // initialisiere HMR/WS nur in DEV
}
\`\`\`
**Ergebnis:** WS-Fehler verschwinden in Prod.`,
        en: `**Diagnosis:** HMR/Dev-WebSocket running in production.
**Fix:** Initialize HMR/WebSocket only in \`import.meta.env.DEV\`.
**Result:** WS errors disappear in prod.`,
        sv: `**Diagnos:** HMR/Dev-WebSocket körs i produktion.
**Fix:** Initiera HMR/WS endast i \`import.meta.env.DEV\`.
**Resultat:** WS-fel försvinner i prod.`,
      };
      return messages[lang];
    },
  },
];

function tryKnownFix(question: string, lang: Lang): string | null {
  for (const k of KNOWN_FIXES) {
    if (k.test.test(question)) {
      return k.answer(lang);
    }
  }
  return null;
}

// === Serve ===
Deno.serve(async (req: Request) => {
  const reqId = crypto.randomUUID();

  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return err("Method Not Allowed", reqId, 405);

    const ct = req.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().includes("application/json")) return err("Unsupported Media Type", reqId, 415);

    let body: any;
    try { body = await req.json(); } catch { return err("Invalid JSON body", reqId, 400); }

    const question = (body?.question ?? "").toString().trim();
    const rawLang = (body?.lang ?? "").toString();
    const sessionId: string = body?.session_id || crypto.randomUUID();
    const userId: string | undefined = body?.user_id;
    const lang = normalizeLang(rawLang);

    if (!question) return err("Missing field: 'question'", reqId, 400);
    if (question.length > 4000) return err("Question too long (max 4000 chars)", reqId, 413);

    // Basic rate limit
    const rl = await checkRate(sessionId);
    if (!rl.ok) return json({ ok: false, error: "Rate limit exceeded", retry_after: rl.retryAfterSec, reqId }, 429);

    // Commands
    if (question.startsWith("/")) {
      const [cmd, arg] = question.toLowerCase().split(/\s+/, 2);

      if (cmd === "/resources") {
        return json(successEnvelope({ sessionId, answer: RESOURCES[lang], reqId, agent: AGENT }), 200);
      }
      if (cmd === "/contact") {
        return json(successEnvelope({ sessionId, answer: CONTACT[lang], reqId, agent: AGENT }), 200);
      }
      if (cmd === "/summary") {
        const hist = await getContext(sessionId);
        const summary = hist.map(h => (h.role === "user" ? "👤" : "🤖") + " " + h.content).join("\n");
        const label = lang === "de" ? "Zusammenfassung (letzte Nachrichten):" : lang === "sv" ? "Sammanfattning (senaste meddelanden):" : "Summary (recent messages):";
        return json(successEnvelope({ sessionId, answer: `**${label}**\n${summary}`, history: hist, reqId, agent: AGENT }), 200);
      }
      if (cmd === "/translate") {
        const target = normalizeLang(arg ?? lang);
        // hole letzte Assistant-Antwort
        const { data } = await sbAdmin
          .from("helpbot_messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(10);
        const lastAssistant = (data ?? []).find((r: any) => r.role === "assistant")?.content ?? "";
        if (!lastAssistant) return json({ ok: false, error: "Nothing to translate", reqId }, 400);

        const translated = await chat([
          { role: "system", content: "Translate the following text faithfully. Do not add explanations." },
          { role: "user", content: `Target language: ${target}\n\nText:\n${lastAssistant}` },
        ], target, lastAssistant);
        await saveMsg(sessionId, "assistant", translated, userId);
        return json(successEnvelope({ sessionId, answer: translated, reqId, agent: AGENT }), 200);
      }

      if (cmd === "/csp") {
        const answer = `**Empfohlene CSP (WASM erlaubt, kein unsafe-eval):**
\`\`\`
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{NONCE}' 'strict-dynamic' 'wasm-unsafe-eval' https: 'self';
  connect-src 'self' https: wss:;
  img-src 'self' https: data:;
  style-src 'self' 'unsafe-inline' https:;
  font-src 'self' https: data:;
  frame-src 'self' https:;
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
\`\`\``;
        return json(successEnvelope({ sessionId, answer, reqId, agent: AGENT }), 200);
      }

      if (cmd === "/headers") {
        const answer = `**CSP + Permissions-Policy + Nginx:**
\`\`\`
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{NONCE}' 'strict-dynamic' 'wasm-unsafe-eval' https: 'self';
  connect-src 'self' https: wss:;
  img-src 'self' https: data:;
  style-src 'self' 'unsafe-inline' https:;
  font-src 'self' https: data:;
  frame-src 'self' https:;
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';

Permissions-Policy:
  geolocation=(), microphone=(), camera=(),
  accelerometer=(), gyroscope=(), magnetometer=(),
  usb=(), bluetooth=(), interest-cohort=()

# Nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'nonce-$request_id' 'strict-dynamic' 'wasm-unsafe-eval' https: 'self'; connect-src 'self' https: wss:; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; frame-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none';" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), bluetooth=(), interest-cohort=()" always;
\`\`\``;
        return json(successEnvelope({ sessionId, answer, reqId, agent: AGENT }), 200);
      }

      if (cmd === "/health") {
        const health = {
          provider: LOVABLE_API_KEY ? "LOVABLE_AI" : "OFFLINE",
          env: {
            SUPABASE_URL: !!SUPABASE_URL,
            SERVICE_ROLE: !!SERVICE_ROLE,
            LOVABLE_API_KEY: !!LOVABLE_API_KEY,
          },
          rate_limit: "30 req / 5 min per session",
          time: new Date().toISOString(),
        };
        const statusLabel = lang === "de" ? "✅ Systemstatus:" : lang === "sv" ? "✅ Systemstatus:" : "✅ System status:";
        const answer = `${statusLabel}\n\`\`\`json\n${JSON.stringify(health, null, 2)}\n\`\`\``;
        return json(successEnvelope({ sessionId, answer, history: [], reqId, provider: health.provider, agent: AGENT }), 200);
      }

      return json({ ok: false, error: `Unknown command: ${cmd}`, reqId }, 400);
    }

    // === Known Pattern Detection (vor AI-Call) ===
    const quickFix = tryKnownFix(question, lang);
    if (quickFix) {
      await saveMsg(sessionId, "user", question, userId);
      await saveMsg(sessionId, "assistant", quickFix, userId);
      const { data: fullHistory } = await sbAdmin
        .from("helpbot_messages")
        .select("role, content, id, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      return json(successEnvelope({ sessionId, answer: quickFix, history: fullHistory ?? [], reqId, agent: AGENT }), 200);
    }

    // Kontext + Persistenz
    const context = await getContext(sessionId);
    const isFirstTurn = context.length === 0;
    
    // Resolve synonyms in question
    const resolvedQuestion = await resolveSynonyms(question);
    await saveMsg(sessionId, "user", question, userId);

    // === Context-Awareness ===
    const activeModule = (body.module || 'global') as string;
    const debug = body.debug === true;

    // 🔍 Alias Resolution & Intent Detection
    const normalizedQuestion = resolvedQuestion.toLowerCase().trim();
    
    // Intent detection
    let intent: "definition"|"benefit"|"module_help"|"legal"|"other" = "other";
    const defTriggers = ["was ist", "what is", "vad är"];
    const benefitTriggers = ["wobei hilft", "wofür", "how does", "what does", "hur hjälper", "vad gör"];
    
    if (defTriggers.some(t => normalizedQuestion.startsWith(t))) intent = "definition";
    else if (benefitTriggers.some(t => normalizedQuestion.includes(t))) intent = "benefit";
    else if (normalizedQuestion.includes("kontrollen") || normalizedQuestion.includes("controls")) intent = "module_help";
    else if (normalizedQuestion.includes("artikel") || normalizedQuestion.includes("article")) intent = "legal";
    
    const aliasMap: Record<Lang, Record<string, string>> = {
      de: {
        "was ist nis2 ai guard": "was ist der nis2 ai guard",
        "was ist der nis2 ai guard": "was ist der nis2 ai guard",
        "was ist das programm": "was ist der nis2 ai guard",
        "was ist dieses programm": "was ist der nis2 ai guard",
        "was ist diese plattform": "was ist der nis2 ai guard",
        "was ist diese software": "was ist der nis2 ai guard",
        "wofür ist der nis2 ai guard": "wobei hilft mir der nis2 ai guard",
        "wofür ist nis2 ai guard": "wobei hilft mir der nis2 ai guard",
        "wofür hilft mir der nis2 ai guard": "wobei hilft mir der nis2 ai guard",
        "wobei hilft mir dieses programm": "wobei hilft mir der nis2 ai guard",
        "was kann der nis2 ai guard": "wobei hilft mir der nis2 ai guard",
        "wozu dient der nis2 ai guard": "wobei hilft mir der nis2 ai guard",
        "was macht der nis2 ai guard": "wobei hilft mir der nis2 ai guard",
        "wofür brauche ich den nis2 ai guard": "wobei hilft mir der nis2 ai guard",
      },
      en: {
        "what is nis2 ai guard": "what is the nis2 ai guard",
        "what is the nis2 ai guard": "what is the nis2 ai guard",
        "what is this program": "what is the nis2 ai guard",
        "what is this platform": "what is the nis2 ai guard",
        "what is this software": "what is the nis2 ai guard",
        "what is this tool": "what is the nis2 ai guard",
        "what is nis2 ai guard for": "how does the nis2 ai guard help me",
        "what does nis2 ai guard do": "how does the nis2 ai guard help me",
        "how does this program help": "how does the nis2 ai guard help me",
        "what can nis2 ai guard do": "how does the nis2 ai guard help me",
        "why do i need nis2 ai guard": "how does the nis2 ai guard help me",
        "how does nis2 ai guard help": "how does the nis2 ai guard help me",
      },
      sv: {
        "vad är nis2 ai guard": "vad är nis2 ai guard",
        "vad är det här programmet": "vad är nis2 ai guard",
        "vad är denna plattform": "vad är nis2 ai guard",
        "vad är denna programvara": "vad är nis2 ai guard",
        "vad är det här verktyget": "vad är nis2 ai guard",
        "vad gör nis2 ai guard": "hur hjälper nis2 ai guard mig",
        "vad är nis2 ai guard till för": "hur hjälper nis2 ai guard mig",
        "hur hjälper detta program": "hur hjälper nis2 ai guard mig",
        "vad kan nis2 ai guard göra": "hur hjälper nis2 ai guard mig",
        "varför behöver jag nis2 ai guard": "hur hjälper nis2 ai guard mig",
      }
    };
    
    // Check if question matches an alias and use canonical form for knowledge lookup
    const questionForKnowledge = aliasMap[lang]?.[normalizedQuestion] || normalizedQuestion;

    // Knowledge für Sprache + Modul laden (mit Alias-Hinweis für Priorisierung)
    const knowledgeContext = await getKnowledgeContext(lang, activeModule, questionForKnowledge);
    const knowledgeKeys = knowledgeContext ? ['loaded'] : [];
    const moduleLabel = activeModule !== 'global' ? `📍 Modul: ${activeModule.toUpperCase()}` : '';

    // === Load Memory ===
    const priorMemory = await loadMemory(sbAdmin, userId, activeModule, lang);
    const memoryBlock = priorMemory.length
      ? `\n\n🧠 Verlauf (gekürzt):\n${priorMemory
          .slice(-6)
          .map(m => (m.role === 'user' ? `Q: ${m.content}` : `A: ${m.content}`))
          .join('\n')}`
      : '';
    
    // === Kollegialer System-Prompt (keine Juristerei, max. 5 Sätze, App-Kontext zuerst) ===
    const knowledgeFirstPrompt: Record<Lang, string> = {
      de: `Du bist **NORRLY** – der kollegiale Assistent im **NIS2 AI Guard**, einer SaaS-Plattform von **Norrland Innovate AB**.
Du bist kein externer Chatbot, sondern ein fester Bestandteil des Systems.
Deine Aufgabe: Unterstütze Anwender:innen bei allen Aufgaben innerhalb des NIS2 AI Guard – z. B. bei Kontrollen, Risikoanalysen, Schulungen und Nachweisen.
Wenn Nutzer:innen nach dem "NIS2 AI Guard" fragen, erkläre, dass es sich um *das Programm selbst* handelt, in dem du integriert bist – eine Plattform zur NIS2- und AI Act-Compliance-Automatisierung.
Antworte immer praxisnah aus der internen Wissensbasis, nicht mit allgemeinen juristischen Definitionen.
Wenn etwas unklar ist, gib kurze, hilfreiche App-Hinweise.
Sprich wie ein erfahrener Kollege – präzise, freundlich und lösungsorientiert.
${moduleLabel}
📘 Internes Wissen:
${knowledgeContext || '(Kein spezifischer Modulkontent gefunden – gib kurze App-Hinweise für dieses Modul.)'}
${memoryBlock}`,
      en: `You are **NORRLY** — the collegial assistant inside the **NIS2 AI Guard**, a SaaS platform by **Norrland Innovate AB**.
You are not an external chatbot but an integrated part of the system.
Your task: assist users in all NIS2 AI Guard modules — controls, risk assessments, training and compliance documentation.
Always answer from internal knowledge first, not from legal text.
If unclear, provide a short, practical in-app hint.
Speak like a trusted colleague — precise, friendly and solution-oriented.
${moduleLabel}
📘 Internal Knowledge:
${knowledgeContext || '(No specific module content found — provide short in-app hints for this module.)'}
${memoryBlock}`,
      sv: `Du är **NORRLY** — den kollegiala assistenten i **NIS2 AI Guard**, en SaaS-plattform från **Norrland Innovate AB**.
Du är ingen extern chatbot, utan en integrerad del av systemet.
Ditt uppdrag: stöd användarna i alla moduler — kontroller, riskanalyser, utbildningar och efterlevnad.
Svara alltid utifrån intern kunskap, inte juridiska texter.
Om något är oklart, ge korta och praktiska tips i appen.
Tala som en kollega: tydligt, vänligt och lösningsorienterat.
${moduleLabel}
📘 Intern kunskap:
${knowledgeContext || '(Ingen specifik modulinformation — ge korta app-tips för denna modul.)'}
${memoryBlock}`
    };

    const enhancedSystemPrompt = knowledgeFirstPrompt[lang];

    // AI Call
    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      ...context,
      { role: "user", content: resolvedQuestion },
    ] as { role: "system" | "user" | "assistant"; content: string }[];

    let rawAnswer = await chat(messages, lang, resolvedQuestion);

    // Intro deaktiviert – Begrüßung erfolgt jetzt ausschließlich über System-Prompt
    // if (isFirstTurn) {
    //   answer = `${INTRO[lang]}\n\n${answer}`;
    // }

    // Sicherheitsnetz gegen juristische Ausuferung (nur harte Zitate entfernen)
    const guardResult = legalGuard(rawAnswer, question);
    const answer = guardResult.answer;

    await saveMsg(sessionId, "assistant", answer, userId);

    // === Save Memory ===
    const toAppend: ChatMsg[] = [
      { role: 'user', content: question },
      { role: 'assistant', content: answer }
    ];
    await saveMemory(sbAdmin, userId, activeModule, lang, toAppend, 4000);

    // gesamte History für Client
    const { data: fullHistory } = await sbAdmin
      .from("helpbot_messages")
      .select("role, content, id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    // Build response payload
    const payload: any = successEnvelope({ 
      sessionId, 
      answer, 
      history: fullHistory ?? [], 
      reqId, 
      provider: "LOVABLE_AI", 
      agent: AGENT 
    });

    // Add debug info if requested
    if (debug) {
      payload.debug = {
        activeModule,
        intent,
        questionForKnowledge,
        knowledgeContextLen: knowledgeContext.length,
        knowledgeKeys,
        legalGuard: {
          triggered: guardResult.triggered,
          reason: guardResult.reason
        },
        promptPreview: enhancedSystemPrompt.slice(0, 400)
      };
    }

    return json(payload, 200);

  } catch (e: any) {
    console.error("[helpbot-chat] fatal", { error: String(e), stack: e?.stack });
    return err(`Internal error: ${e?.message ?? "Unknown"}`, crypto.randomUUID(), 500);
  }
});
