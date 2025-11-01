/**
 * Security guardrails for Norrly chatbot (backend version)
 * Classifies user queries to prevent prompt injection, data leakage, and cloning attempts
 */

export type QueryClass = "ALLOW" | "DENY" | "REVIEW";

export interface ClassificationResult {
  decision: QueryClass;
  reason?: string;
  category?: string;
}

/**
 * Patterns that indicate attempts to extract sensitive information or bypass security
 */
const DENY_PATTERNS = [
  // Source code & repository
  { pattern: /quelle|quellcode|source\s?code|repo|git|github/i, category: "source_code" },
  
  // System prompts & configuration
  { pattern: /system-?prompt|hidden\s?prompt|konfig|config|setup/i, category: "system_config" },
  
  // Credentials & secrets
  { pattern: /api[-\s]?key|token|secret|env|dotenv|password|credential/i, category: "credentials" },
  
  // Backend & infrastructure
  { pattern: /backend|endpoint|admin|internal\s?url|supabase|postgres|database/i, category: "infrastructure" },
  
  // Database schema
  { pattern: /db[-\s]?schema|migration|sql|er[-\s]?diagram|table\s?structure/i, category: "database" },
  
  // Build & deployment
  { pattern: /build|deploy|docker|pipeline|vite|next\s?config|deployment/i, category: "deployment" },
  
  // License bypass
  { pattern: /lizenz|paywall|abo.*umgehen|bypass|crack|free.*premium|skip.*payment/i, category: "license_bypass" },
  
  // Cloning & reverse engineering
  { pattern: /clone|kopier(e|en)|nachbauen|reverse\s?engineer|replicate|copy.*code/i, category: "cloning" },
  
  // Jailbreak attempts
  { pattern: /ignorier(e|en)\s?(alle\s?)?regel|override|forget.*instructions|act\s?as|pretend/i, category: "jailbreak" }
];

/**
 * Patterns that require careful handling but may not always be malicious
 */
const REVIEW_PATTERNS = [
  { pattern: /rechtlich|legal|datenschutz|privacy|kundendaten|customer\s?data/i, category: "legal" },
  { pattern: /health|medizin|medical|diagnose|treatment/i, category: "medical" }
];

/**
 * Classify a user query for security filtering
 */
export function classifyQuery(query: string): ClassificationResult {
  const normalized = query.trim().toLowerCase();
  
  // Check DENY patterns first (highest priority)
  for (const { pattern, category } of DENY_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        decision: "DENY",
        reason: "Security policy violation",
        category
      };
    }
  }
  
  // Check REVIEW patterns
  for (const { pattern, category } of REVIEW_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        decision: "REVIEW",
        reason: "Requires careful handling",
        category
      };
    }
  }
  
  // Default: allow
  return {
    decision: "ALLOW"
  };
}

/**
 * Get localized denial message based on category
 */
export function getDenialMessage(category: string | undefined, lang: "de" | "en" | "sv"): string {
  const messages = {
    de: {
      technical: "Dazu kann ich keine Details teilen. Wenn du Norrly nutzen möchtest, helfe ich dir gern mit den verfügbaren Funktionen und Anleitungen.",
      credentials: "Zugangs- und Systeminformationen sind vertraulich und werden nicht offengelegt. Benötigst du Hilfe bei der Anwendung?",
      license: "Ich kann nicht dabei helfen, Lizenz- oder Sicherheitsmechanismen zu umgehen. Gern erkläre ich dir die offiziellen Nutzungsmöglichkeiten.",
      cloning: "Ich kann nicht dabei helfen, unser Produkt zu kopieren oder nachzubauen. Gern erkläre ich dir die offiziellen Nutzungsmöglichkeiten.",
      generic: "Diese Anfrage kann ich aus Sicherheitsgründen nicht beantworten. Kann ich dir auf andere Weise helfen?"
    },
    en: {
      technical: "I cannot share details about that. If you'd like to use Norrly, I'm happy to help with available features and documentation.",
      credentials: "Access and system information is confidential and cannot be disclosed. Do you need help with the application?",
      license: "I cannot help bypass license or security mechanisms. I'm happy to explain official usage options.",
      cloning: "I cannot help copy or replicate our product. I'm happy to explain official usage options.",
      generic: "I cannot answer this request for security reasons. Can I help you in another way?"
    },
    sv: {
      technical: "Jag kan inte dela detaljer om det. Om du vill använda Norrly hjälper jag dig gärna med tillgängliga funktioner och dokumentation.",
      credentials: "Åtkomst- och systeminformation är konfidentiell och kan inte avslöjas. Behöver du hjälp med applikationen?",
      license: "Jag kan inte hjälpa till att kringgå licens- eller säkerhetsmekanismer. Jag förklarar gärna officiella användningsalternativ.",
      cloning: "Jag kan inte hjälpa till att kopiera eller replikera vår produkt. Jag förklarar gärna officiella användningsalternativ.",
      generic: "Jag kan inte svara på denna förfrågan av säkerhetsskäl. Kan jag hjälpa dig på annat sätt?"
    }
  };

  const langMessages = messages[lang] || messages.de;
  
  switch (category) {
    case "source_code":
    case "system_config":
    case "infrastructure":
    case "database":
    case "deployment":
      return langMessages.technical;
    
    case "credentials":
      return langMessages.credentials;
    
    case "license_bypass":
      return langMessages.license;
    
    case "cloning":
    case "jailbreak":
      return langMessages.cloning;
    
    default:
      return langMessages.generic;
  }
}

/**
 * Rate limiting state (in-memory, per session)
 */
const rateLimitState = new Map<string, { denials: number; lastDenial: number }>();

/**
 * Check if user should be rate-limited due to repeated denials
 */
export function checkRateLimit(userId: string): { limited: boolean; reason?: string; lang?: "de" | "en" | "sv" } {
  const now = Date.now();
  const state = rateLimitState.get(userId);
  
  if (!state) {
    return { limited: false };
  }
  
  // Reset if last denial was more than 60 seconds ago
  if (now - state.lastDenial > 60000) {
    rateLimitState.delete(userId);
    return { limited: false };
  }
  
  // Cool-down after 3 denials in 60 seconds
  if (state.denials >= 3) {
    return {
      limited: true,
      reason: "Too many blocked requests. Please wait 2 minutes."
    };
  }
  
  return { limited: false };
}

/**
 * Record a denial for rate limiting
 */
export function recordDenial(userId: string): void {
  const now = Date.now();
  const state = rateLimitState.get(userId);
  
  if (!state || now - state.lastDenial > 60000) {
    rateLimitState.set(userId, { denials: 1, lastDenial: now });
  } else {
    state.denials++;
    state.lastDenial = now;
  }
}
