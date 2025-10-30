// Kollege Norrly - AI Compliance Assistant

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chat } from "../_shared/lovableClient.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Lang = "de" | "en" | "sv";

function normalizeLang(input?: string): Lang {
  const two = (input ?? "de").toLowerCase().slice(0, 2);
  if (two === "en") return "en";
  if (two === "sv") return "sv";
  return "de";
}

const SYSTEM_PROMPTS: Record<Lang, string> = {
  de: `Du bist Kollege Norrly – ein freundlicher, fachkundiger Compliance-Assistent für NIS2 und EU AI Act.

**Deine Rolle:**
- Beantworte Fragen zu NIS2, EU AI Act, GDPR und DORA klar und praxisnah
- Erkläre komplexe Vorschriften einfach und auf Augenhöhe
- Verweise auf offizielle Quellen (EUR-Lex, ENISA, EU-Kommission)
- Biete am Ende einen "Norrly-Tipp" an

**Verhalten:**
- Prüfe bei NIS2-Fragen, ob "Essential Entity" oder "Important Entity" betroffen ist
- Bei KI-Bezug: erläutere AI-Act-Artikel (Art. 4, 29, 52)
- Wenn unklar: bitte um Konkretisierung
- Immer offizielle EU-Links verwenden (keine Blogs)`,

  en: `You are Colleague Norrly – a friendly, expert compliance assistant for NIS2 and EU AI Act.

**Your Role:**
- Answer questions about NIS2, EU AI Act, GDPR and DORA clearly and practically
- Explain complex regulations simply and at eye level
- Reference official sources (EUR-Lex, ENISA, EU Commission)
- Offer a "Norrly tip" at the end

**Behavior:**
- For NIS2 questions: check if "Essential Entity" or "Important Entity" is affected
- For AI topics: explain AI Act articles (Art. 4, 29, 52)
- If unclear: ask for clarification
- Always use official EU links (no blogs)`,

  sv: `Du är Kollegan Norrly – en vänlig, kunnig compliance-assistent för NIS2 och EU AI Act.

**Din Roll:**
- Svara på frågor om NIS2, EU AI Act, GDPR och DORA tydligt och praktiskt
- Förklara komplexa regler enkelt och på ögonhöjd
- Hänvisa till officiella källor (EUR-Lex, ENISA, EU-kommissionen)
- Erbjud ett "Norrly-tips" i slutet

**Beteende:**
- För NIS2-frågor: kontrollera om "Essential Entity" eller "Important Entity" berörs
- För AI-ämnen: förklara AI Act-artiklar (Art. 4, 29, 52)
- Om oklart: be om förtydligande
- Använd alltid officiella EU-länkar (inga bloggar)`
};

async function getContext(sessionId: string): Promise<Array<{role: string; content: string}>> {
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data } = await sb
      .from("helpbot_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data && data.length > 0) {
      return data.reverse();
    }
  } catch (e) {
    console.warn("[helpbot-chat] context fetch failed", e);
  }
  return [];
}

async function saveMsg(sessionId: string, role: string, content: string, userId?: string) {
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    await sb.from("helpbot_messages").insert({
      session_id: sessionId,
      role,
      content,
      user_id: userId || null,
    });
  } catch (e) {
    console.warn("[helpbot-chat] save failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const body = await req.json();
    const question = (body?.question ?? "").toString().trim();
    const rawLang = (body?.lang ?? "").toString();
    const sessionId = body?.session_id || crypto.randomUUID();
    const userId = body?.user_id;

    if (!question) {
      return json({ error: "Missing question" }, 400);
    }

    if (question.length > 4000) {
      return json({ error: "Question too long" }, 413);
    }

    const lang = normalizeLang(rawLang);

    // Handle special commands
    if (question.startsWith("/")) {
      const cmd = question.toLowerCase().split(" ")[0];
      
      if (cmd === "/resources") {
        const resources: Record<Lang, string> = {
          de: "📚 **Offizielle Quellen:**\n- [NIS2 Richtlinie (EUR-Lex)](https://eur-lex.europa.eu/eli/dir/2022/2555/oj)\n- [EU AI Act](https://artificialintelligenceact.eu/)\n- [ENISA](https://www.enisa.europa.eu/)\n- [EU-Kommission Cybersecurity](https://digital-strategy.ec.europa.eu/en/policies/cybersecurity)",
          en: "📚 **Official Sources:**\n- [NIS2 Directive (EUR-Lex)](https://eur-lex.europa.eu/eli/dir/2022/2555/oj)\n- [EU AI Act](https://artificialintelligenceact.eu/)\n- [ENISA](https://www.enisa.europa.eu/)\n- [EU Commission Cybersecurity](https://digital-strategy.ec.europa.eu/en/policies/cybersecurity)",
          sv: "📚 **Officiella Källor:**\n- [NIS2-direktiv (EUR-Lex)](https://eur-lex.europa.eu/eli/dir/2022/2555/oj)\n- [EU AI Act](https://artificialintelligenceact.eu/)\n- [ENISA](https://www.enisa.europa.eu/)\n- [EU-kommissionen Cybersäkerhet](https://digital-strategy.ec.europa.eu/en/policies/cybersecurity)"
        };
        
        return json({
          ok: true,
          session_id: sessionId,
          answer: resources[lang],
          sources: [],
          history: [],
        });
      }
      
      if (cmd === "/contact") {
        const contact: Record<Lang, string> = {
          de: "📧 **Kontakt:**\nFür weitere Unterstützung wenden Sie sich an Ihr Compliance-Team oder support@nis2-ai-guard.eu",
          en: "📧 **Contact:**\nFor further support, contact your compliance team or support@nis2-ai-guard.eu",
          sv: "📧 **Kontakt:**\nFör ytterligare support, kontakta ditt compliance-team eller support@nis2-ai-guard.eu"
        };
        
        return json({
          ok: true,
          session_id: sessionId,
          answer: contact[lang],
          sources: [],
          history: [],
        });
      }
    }

    // Get conversation context
    const context = await getContext(sessionId);

    // Save user message
    await saveMsg(sessionId, "user", question, userId);

    // Build messages for AI
    const messages = [
      { role: "system", content: SYSTEM_PROMPTS[lang] },
      ...context,
      { role: "user", content: question }
    ];

    // Call Lovable AI
    const answer = await chat(messages);

    // Save assistant message
    await saveMsg(sessionId, "assistant", answer, userId);

    // Get full history
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: fullHistory } = await sb
      .from("helpbot_messages")
      .select("role, content, id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    return json({
      ok: true,
      provider: "LOVABLE_AI",
      session_id: sessionId,
      answer,
      sources: [],
      history: fullHistory || [],
    });

  } catch (e: any) {
    console.error("[helpbot-chat] error", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
