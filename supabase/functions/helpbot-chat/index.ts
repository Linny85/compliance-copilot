// Kollege Norrly - Hardened AI Compliance Assistant
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Helper functions
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const err = (message: string, reqId: string, status = 400) => 
  json({ ok: false, error: message, reqId }, status);

// === Typen & Sprache ===
type Lang = "de" | "en" | "sv";
const VALID_LANGS: readonly Lang[] = ["de", "en", "sv"] as const;
function normalizeLang(input?: string): Lang {
  const two = (input ?? "de").toLowerCase().slice(0, 2);
  return (VALID_LANGS as readonly string[]).includes(two) ? (two as Lang) : "de";
}

// === Agent Metadaten ===
const AGENT = {
  name: "Kollege Norrly",
  description: "Interaktiver Compliance-Chatbot für NIS2 & EU AI Act – klare Antworten, EU-Quellen & Norrly-Tipps.",
  avatar: "🤖"
};

const INTRO: Record<Lang, string> = {
  de: `Ich bin **${AGENT.name}** – ${AGENT.description}`,
  en: `I'm **${AGENT.name}** – ${AGENT.description}`,
  sv: `Jag är **${AGENT.name}** – ${AGENT.description}`,
};

// === System Prompts ===
const SYSTEM_PROMPTS: Record<Lang, string> = {
  de: `Du bist Kollege Norrly – ein freundlicher, fachkundiger Compliance-Assistent für NIS2 und EU AI Act.

Deine Rolle:
- Beantworte Fragen zu NIS2, EU AI Act, GDPR und DORA klar und praxisnah
- Erkläre komplexe Vorschriften einfach und auf Augenhöhe
- Verweise auf offizielle Quellen (EUR-Lex, ENISA, EU-Kommission)
- Biete am Ende einen "Norrly-Tipp" an

Verhalten:
- Prüfe bei NIS2-Fragen, ob "Essential Entity" oder "Important Entity" betroffen ist
- Bei KI-Bezug: erläutere AI-Act-Artikel (z. B. Art. 4, 29, 52)
- Wenn unklar: bitte kurz um Konkretisierung
- Verwende offizielle EU-Links (keine Blogs)`,
  en: `You are Colleague Norrly – a friendly, expert compliance assistant for NIS2 and the EU AI Act.

Your role:
- Answer questions about NIS2, EU AI Act, GDPR and DORA clearly and practically
- Explain complex regulations simply and at eye level
- Reference official sources (EUR-Lex, ENISA, EU Commission)
- Offer a "Norrly tip" at the end

Behavior:
- For NIS2: check if "Essential Entity" or "Important Entity" is affected
- For AI: explain AI Act articles (e.g., Art. 4, 29, 52)
- If unclear: ask briefly for clarification
- Use official EU links (no blogs)`,
  sv: `Du är Kollegan Norrly – en vänlig och kunnig compliance-assistent för NIS2 och EU AI Act.

Din roll:
- Svara tydligt och praktiskt på frågor om NIS2, EU AI Act, GDPR och DORA
- Förklara komplexa regler enkelt och på ögonhöjd
- Hänvisa till officiella källor (EUR-Lex, ENISA, EU-kommissionen)
- Avsluta gärna med ett "Norrly-tips"

Beteende:
- För NIS2: kontrollera om "Essential Entity" eller "Important Entity" berörs
- För AI: förklara artiklar i AI Act (t.ex. Art. 4, 29, 52)
- Använd officiella EU-länkar (inga bloggar)`,
};

// === DB ===
const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

type ChatRow = { role: "user" | "assistant" | "system"; content: string };

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

// === Lovable Chat Call ===
async function chat(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("AI service not configured");
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
        return json({ ok: true, session_id: sessionId, agent: AGENT, answer: RESOURCES[lang], sources: [], history: [], reqId }, 200);
      }
      if (cmd === "/contact") {
        return json({ ok: true, session_id: sessionId, agent: AGENT, answer: CONTACT[lang], sources: [], history: [], reqId }, 200);
      }
      if (cmd === "/summary") {
        const hist = await getContext(sessionId);
        const summary = hist.map(h => (h.role === "user" ? "👤" : "🤖") + " " + h.content).join("\n");
        const label = lang === "de" ? "Zusammenfassung (letzte Nachrichten):" : lang === "sv" ? "Sammanfattning (senaste meddelanden):" : "Summary (recent messages):";
        return json({ ok: true, session_id: sessionId, agent: AGENT, answer: `**${label}**\n${summary}`, sources: [], history: hist, reqId }, 200);
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
        ]);
        await saveMsg(sessionId, "assistant", translated, userId);
        return json({ ok: true, session_id: sessionId, agent: AGENT, answer: translated, sources: [], history: [], reqId }, 200);
      }

      return json({ ok: false, error: `Unknown command: ${cmd}`, reqId }, 400);
    }

    // Kontext + Persistenz
    const context = await getContext(sessionId);
    const isFirstTurn = context.length === 0;
    await saveMsg(sessionId, "user", question, userId);

    // AI Call
    const messages = [
      { role: "system", content: SYSTEM_PROMPTS[lang] },
      ...context,
      { role: "user", content: question },
    ] as { role: "system" | "user" | "assistant"; content: string }[];

    let answer = await chat(messages);

    // Intro nur beim ersten Turn einblenden
    if (isFirstTurn) {
      answer = `${INTRO[lang]}\n\n${answer}`;
    }

    await saveMsg(sessionId, "assistant", answer, userId);

    // gesamte History für Client
    const { data: fullHistory } = await sbAdmin
      .from("helpbot_messages")
      .select("role, content, id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    return json({ ok: true, provider: "LOVABLE_AI", session_id: sessionId, agent: AGENT, answer, sources: [], history: fullHistory ?? [], reqId }, 200);

  } catch (e: any) {
    console.error("[helpbot-chat] fatal", { error: String(e), stack: e?.stack });
    return err(`Internal error: ${e?.message ?? "Unknown"}`, crypto.randomUUID(), 500);
  }
});
