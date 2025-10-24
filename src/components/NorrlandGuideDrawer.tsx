import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function NorrlandGuideDrawer({ 
  open, 
  setOpen 
}: { 
  open: boolean; 
  setOpen: (v: boolean) => void 
}) {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<"de" | "en" | "sv">("de");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [disc, setDisc] = useState("");
  const first = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && first.current) first.current.focus();
  }, [open]);

  async function ask() {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer("");
    setSources([]);
    
    try {
      const { data, error } = await supabase.functions.invoke("helpbot-query", {
        body: { question: q.trim(), lang }
      });

      if (error) throw error;
      
      setAnswer(data?.answer ?? "");
      setSources(data?.sources ?? []);
      setDisc(data?.disclaimer ?? "");
    } catch (err: any) {
      setAnswer(`Fehler: ${err?.message ?? "Unbekannter Fehler"}`);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Norrland Guide</h2>
          <button 
            onClick={() => setOpen(false)} 
            aria-label="Close"
            className="text-foreground hover:text-muted-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <textarea 
            ref={first} 
            value={q} 
            onChange={e => setQ(e.target.value)}
            className="w-full h-28 rounded border border-border bg-background text-foreground p-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Frage eingeben…" 
          />
          <div className="flex gap-2">
            <select 
              value={lang} 
              onChange={e => setLang(e.target.value as any)}
              className="border border-border rounded bg-background text-foreground p-2"
            >
              <option value="de">DE</option>
              <option value="en">EN</option>
              <option value="sv">SV</option>
            </select>
            <button 
              onClick={ask} 
              disabled={loading}
              className="ml-auto px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Lädt…" : "Fragen"}
            </button>
          </div>

          {!!answer && (
            <div className="space-y-2">
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground">
                {answer}
              </div>
              {sources?.length ? (
                <div className="text-sm text-muted-foreground">
                  Quellen:{" "}
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
              ) : null}
              {disc ? (
                <div className="text-xs text-muted-foreground italic">
                  {disc}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
