import { useEffect, useMemo, useState } from 'react';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Loader2, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mitigation = {
  code: string;
  title_de: string;
  title_en: string;
  title_sv: string;
  body_de: string;
  body_en: string;
  body_sv: string;
  tags?: string[];
  severity?: 'low' | 'medium' | 'high' | null;
};

function getLocalizedTitle(m: Mitigation, lang: 'de' | 'en' | 'sv'): string {
  return (lang === 'sv' ? m.title_sv : lang === 'en' ? m.title_en : m.title_de) || m.title_en || m.title_de || m.code;
}

function getLocalizedBody(m: Mitigation, lang: 'de' | 'en' | 'sv'): string {
  return (lang === 'sv' ? m.body_sv : lang === 'en' ? m.body_en : m.body_de) || m.body_en || m.body_de || '';
}

export function MitigationSelect({
  value,
  onChange,
  currentBody,
  disabled
}: {
  value: string[];
  onChange: (codes: string[], mergedBody: string) => void;
  currentBody: string;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation(['nis2', 'common']);
  const [all, setAll] = useState<Mitigation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lang = (i18n.resolvedLanguage || 'de').slice(0, 2) as 'de' | 'en' | 'sv';

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('risk_mitigation_templates')
        .select('*')
        .order('title_de');
      
      if (!mounted) return;
      
      if (error) {
        setError(error.message);
        toast.error(t('common:errorLoading', 'Fehler beim Laden der Vorlagen'));
        setAll([]);
      } else {
        setAll((data as Mitigation[]) ?? []);
      }
      
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [t]);

  const selected = useMemo(() => all.filter(m => value.includes(m.code)), [all, value]);

  function toggle(code: string) {
    const next = value.includes(code) ? value.filter(c => c !== code) : [...value, code];
    const merged = mergeBodies(next);
    onChange(next, merged);
  }

  function mergeBodies(codes: string[]): string {
    const blocks = codes
      .map(c => all.find(m => m.code === c))
      .filter(Boolean)
      .map(m => `### ${getLocalizedTitle(m!, lang)}\n${getLocalizedBody(m!, lang)}`);
    
    // Extract free text (anything not part of template blocks)
    const templatePattern = /^### .+\n[\s\S]*?(?=\n### |$)/gm;
    const templateBlocks = new Set(blocks);
    const currentLines = currentBody?.trim() || '';
    
    // Remove old template blocks from current body
    let freeText = currentLines.replace(templatePattern, '').trim();
    if (freeText.startsWith('---')) {
      freeText = freeText.replace(/^---\s*/, '').trim();
    }
    
    const free = freeText ? `\n\n---\n${freeText}` : '';
    return blocks.join('\n\n') + free;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.map(m => (
          <Badge key={m.code} variant="secondary" className="gap-1">
            {getLocalizedTitle(m, lang)}
            <button
              aria-label={t('common:remove', 'Entfernen') as string}
              onClick={() => toggle(m.code)}
              className="ml-1 hover:text-destructive"
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || loading}
              type="button"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common:loading', 'Lädt…')}
                </>
              ) : (
                <>
                  {t('nis2:form.chooseMitigations', 'Maßnahmen auswählen')}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            {error ? (
              <div className="p-4 text-sm text-destructive">
                {t('common:errorLoading', 'Fehler beim Laden')}: {error}
              </div>
            ) : (
              <Command>
                <CommandInput placeholder={t('common:search', 'Suchen…') as string} />
                <CommandEmpty>{t('common:noResults', 'Keine Ergebnisse')}</CommandEmpty>
                <CommandGroup heading={t('nis2:form.suggestions', 'Vorschläge')} className="max-h-64 overflow-y-auto">
                  {all.map(m => (
                    <CommandItem 
                      key={m.code} 
                      onSelect={() => {
                        toggle(m.code);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col w-full">
                        <span className="font-medium">{getLocalizedTitle(m, lang)}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.code} • {(m.tags || []).join(', ')}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
