import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { detectIntents, type ChatAction } from "@/features/assistant/intents";
import { canAccess } from "@/lib/rbac";
import { navigateGlobal } from "@/lib/navigation";
import { sanitize } from "@/helpbot/outputSanitizer";
import { contextHint } from "@/helpbot/contextHints";

const FIRST_SEEN_KEY = 'norrly_seen_session';

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  id?: string;
}

export function NorrlandGuideDrawer({ 
  open, 
  setOpen 
}: { 
  open: boolean; 
  setOpen: (v: boolean) => void 
}) {
  const { t, i18n, ready } = useTranslation(["assistant", "helpbot", "norrly"], { useSuspense: false });
  
  if (!ready && open) return null;

  const firstSeen = useRef(!sessionStorage.getItem(FIRST_SEEN_KEY));
  
  useEffect(() => {
    if (firstSeen.current) {
      sessionStorage.setItem(FIRST_SEEN_KEY, '1');
    }
  }, []);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [disc, setDisc] = useState("");
  const [ttsOn, setTtsOn] = useState(false);
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);
  const first = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Translations - only access after ready
  const name = ready ? t("assistant:name") : "";
  const tagline = ready ? t("norrly:header.subtitle") : "";
  const greetingHeadline = ready ? t("norrly:intro.headline") : "";
  const greetingText = ready ? t("norrly:intro.text") : "";
  const intro = ready && firstSeen.current ? t("helpbot:intro") : undefined;
  
  const quickCtas = ready ? [
    { id: 'incident', label: t('norrly:cta.incident'), payload: t('norrly:cta.incident') },
    { id: 'register', label: t('norrly:cta.register'), payload: t('norrly:cta.register') },
    { id: 'roles', label: t('norrly:cta.roles'), payload: t('norrly:cta.roles') },
    { id: 'audit', label: t('norrly:cta.audit'), payload: t('norrly:cta.audit') },
    { id: 'training', label: t('norrly:cta.training'), payload: t('norrly:cta.training') }
  ] : [];
  
  const labels = ready ? {
    open: t("norrly:input.open"),
    cancel: t("norrly:input.cancel"),
    loading: t("norrly:input.loading"),
    speak_on: t("norrly:voice.on"),
    speak_off: t("norrly:voice.off"),
    reset: t("norrly:session.reset")
  } : { open: "", cancel: "", loading: "", speak_on: "", speak_off: "", reset: "" };

  // User context (Platzhalter bis echter Context genutzt wird)
  const user = { role: 'admin' } as const;

  const supportsTTS = typeof window !== "undefined" && "speechSynthesis" in window;

  // Fire-and-forget Audit-Helper
  const audit = (event: string, data: Record<string, any>) => {
    const payload = { event, ...data, ts: new Date().toISOString() };
    fetch('/functions/v1/audit-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  const speak = (text: string) => {
    if (!supportsTTS) return;
    const sanitized = sanitize(text);
    const utterance = new SpeechSynthesisUtterance(sanitized);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    if (i18n.language?.startsWith("de")) utterance.lang = "de-DE";
    else if (i18n.language?.startsWith("sv")) utterance.lang = "sv-SE";
    else utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (open && first.current) first.current.focus();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (ttsOn && last?.role === "assistant") {
      speak(last.content);
    }
  }, [messages, ttsOn]);

  // Handle navigation with RBAC check
  async function handleNavigation(action: ChatAction) {
    try {
      const hasPermission = canAccess(action.path, user);
      
      if (!hasPermission) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: t('norrly:nav.denied')
        }]);
        setPendingAction(null);
        return;
      }

      // Navigate and confirm
      navigateGlobal(action.path);
      
      // Scroll to highlighted element if specified
      if (action.highlight) {
        setTimeout(() => {
          const el = document.querySelector(action.highlight!);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: t('norrly:nav.ok', { target: action.label })
      }]);
      
      // Close drawer after navigation
      setTimeout(() => setOpen(false), 800);
      
      audit('norrly_navigation', { 
        path: action.path, 
        label: action.label,
        confidence: action.confidence 
      });
    } catch (err) {
      console.error('[Navigation error]', err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: t('norrly:nav.error')
      }]);
    } finally {
      setPendingAction(null);
    }
  }

  async function ask() {
    if (!q.trim()) return;
    
    const currentQuestion = q.trim();
    setQ(""); // Clear input immediately
    setLoading(true);
    
    // Check for intents locally
    const lang3 = (i18n.language?.slice(0,2) ?? 'de') as 'de'|'en'|'sv';
    const suggested = detectIntents(currentQuestion, lang3);
    
    // If navigation intent detected with high confidence, handle immediately
    if (suggested[0] && suggested[0].confidence >= 0.85) {
      setMessages(prev => [...prev, { role: "user", content: currentQuestion }]);
      setLoading(false);
      await handleNavigation(suggested[0]);
      return;
    }
    
    try {
      // Normalize language to valid options
      const rawLang = i18n.language?.slice(0, 2)?.toLowerCase() ?? 'de';
      const validLangs = ['de', 'en', 'sv'] as const;
      const currentLang = (validLangs.includes(rawLang as any) ? rawLang : 'en') as 'de' | 'en' | 'sv';
      
      // === Automatische Modul-Erkennung ===
      const pathname = window.location.pathname;
      const moduleMatch = pathname
        .split('/')
        .find((seg) =>
          ['dashboard', 'checks', 'controls', 'documents', 'evidence', 'training', 'admin', 'billing', 'organization'].includes(seg)
        );
      const activeModule = moduleMatch || 'global';
      const contextInfo = contextHint(pathname);
      
      // Get auth session for authorization header
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      
      const { data, error } = await supabase.functions.invoke("helpbot-chat", {
        body: { 
          question: contextInfo ? `${contextInfo}\n${currentQuestion}` : currentQuestion,
          lang: currentLang,
          module: activeModule, // 🧠 Kontext für NORRLY
          session_id: sessionId || undefined,
          jurisdiction: "EU",
          user_id: sessionData?.session?.user?.id || undefined
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      if (error) {
        console.error("[NorrlandGuide] Chat function error:", {
          name: error.name,
          message: error.message,
          status: (error as any)?.status,
          details: error
        });
        
        // Debug raw response for troubleshooting
        if (import.meta.env.DEV) {
          try {
            const rawRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helpbot-chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ question: currentQuestion, lang: currentLang }),
            });
            const rawText = await rawRes.text();
            console.log('[RAW DEBUG]', rawRes.status, rawText);
          } catch (e) {
            console.log('[RAW DEBUG] network error', e);
          }
        }
        
        setMessages(prev => [...prev, 
          { role: "user", content: currentQuestion },
          { role: "assistant", content: `Fehler: ${error.message || "Edge Function antwortet nicht erwartungsgemäß."}` }
        ]);
        setLoading(false);
        return;
      }
      
      if (data?.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      // Add user message and assistant response to messages
      const sanitizedAnswer = sanitize(data?.answer || "Keine Antwort erhalten.");
      setMessages(prev => [
        ...prev,
        { role: "user", content: currentQuestion },
        { role: "assistant", content: sanitizedAnswer, id: data?.message_id }
      ]);
      
      setSources(data?.sources ?? []);
      setDisc(data?.disclaimer ?? "");
    } catch (err: any) {
      console.error("[NorrlandGuide] Chat error:", err);
      setMessages(prev => [...prev, 
        { role: "user", content: currentQuestion },
        { role: "assistant", content: `Fehler: ${err?.message ?? "Unbekannter Fehler"}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetSession() {
    setSessionId(null);
    setMessages([]);
    setSources([]);
    setDisc("");
    setQ("");
  }

  async function sendFeedback(messageId: string, rating: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.functions.invoke("helpbot-feedback", {
        body: {
          message_id: messageId,
          user_id: user?.id ?? null,
          rating,
          comment: null
        }
      });

      if (error) {
        console.error("[NorrlandGuide] Feedback error:", error);
      } else {
        console.log("[NorrlandGuide] Feedback sent successfully");
      }
    } catch (err) {
      console.error("[NorrlandGuide] Failed to send feedback:", err);
    }
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="helpbot-panel fixed inset-0 z-50 bg-black/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
              🌿
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{name}</h2>
              <p className="text-xs text-muted-foreground">{tagline}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {supportsTTS && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTtsOn(v => !v)}
                title={ttsOn ? labels.speak_off : labels.speak_on}
                className="text-muted-foreground hover:text-foreground"
              >
                {ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={resetSession}
              title={labels.reset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <button 
              onClick={() => setOpen(false)} 
              aria-label="Close"
              className="text-foreground hover:text-muted-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
            <div className="space-y-4">
              {intro && (
                <div className="bg-muted/50 text-foreground px-4 py-3 rounded-lg text-sm leading-relaxed border border-border">
                  {intro}
                </div>
              )}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">{greetingHeadline}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{greetingText}</p>
              </div>
              {quickCtas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Schnellstart:</p>
                  <div className="flex flex-col gap-2">
                    {quickCtas.map((cta) => (
                      <button
                        key={cta.id}
                        onClick={() => {
                          setQ(cta.payload);
                          setTimeout(() => ask(), 50);
                        }}
                        className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        {cta.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
                <div 
                  className={
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-[80%]"
                      : "bg-muted text-foreground px-4 py-2 rounded-lg max-w-[80%]"
                  }
                >
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                </div>
                {msg.role === "assistant" && msg.id && (
                  <div className="flex gap-2 mt-2 text-xs">
                    <button
                      onClick={() => sendFeedback(msg.id!, 1)}
                      className="hover:opacity-70 transition-opacity px-2 py-1 rounded"
                      title="Hilfreich"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => sendFeedback(msg.id!, -1)}
                      className="hover:opacity-70 transition-opacity px-2 py-1 rounded"
                      title="Nicht hilfreich"
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse delay-100">●</div>
                  <div className="animate-pulse delay-200">●</div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sources & Disclaimer */}
        {sources.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground">
              <strong>Quellen:</strong>{" "}
              {sources.map((s, i) => (
                <a 
                  key={i} 
                  href={s.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline mr-2 hover:text-foreground"
                >
                  {s.title}
                </a>
              ))}
            </div>
            {disc && (
              <div className="text-xs text-muted-foreground italic mt-1">
                {disc}
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background">
          <div className="space-y-3">
            <textarea 
              ref={first} 
              value={q} 
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              className="w-full h-20 rounded border border-border bg-background text-foreground p-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder={t("norrly:input.placeholder")}
              disabled={loading}
            />
            <div className="flex gap-2">
              <select 
                value={i18n.language?.slice(0, 2) ?? 'de'} 
                onChange={e => i18n.changeLanguage(e.target.value)}
                className="border border-border rounded bg-background text-foreground p-2 text-sm"
                disabled={loading}
              >
                <option value="de">DE</option>
                <option value="en">EN</option>
                <option value="sv">SV</option>
              </select>
              <Button 
                onClick={ask} 
                disabled={loading || !q.trim()}
                className="ml-auto px-4 py-2"
              >
                {loading ? labels.loading : labels.open}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Confirmation */}
        {pendingAction && pendingAction.type === 'NAVIGATE' && (
          <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-border bg-background/95 backdrop-blur p-3 shadow-lg max-w-sm">
            <div className="mb-2 text-sm text-foreground">
              {labels.open}: <code className="text-xs bg-muted px-1 py-0.5 rounded">{pendingAction.path}</code>?
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  // RBAC prüfen
                  if (!canAccess(pendingAction.path, user)) {
                    console.warn('No permission for', pendingAction.path);
                    audit('chat.intent_denied', { path: pendingAction.path });
                    setPendingAction(null);
                    return;
                  }
                  
                  // Audit loggen (erfolgreiche Ausführung)
                  audit('chat.intent_confirmed', { path: pendingAction.path });
                  
                  navigateGlobal(pendingAction.path, false);
                  // Optional highlight
                  setTimeout(() => {
                    if (pendingAction.highlight) {
                      const el = document.querySelector(pendingAction.highlight);
                      el?.classList.add('ring-2','ring-primary');
                      setTimeout(() => {
                        el?.classList.remove('ring-2','ring-primary');
                      }, 3000);
                    }
                  }, 60);
                  setPendingAction(null);
                  setOpen(false);
                }}
              >
                {labels.open}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setPendingAction(null)}
              >
                {labels.cancel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
