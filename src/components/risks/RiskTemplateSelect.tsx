import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RiskTemplate = {
  id: string;
  code: string;
  title_de: string;
  title_en: string;
  title_sv: string;
  default_level: 'low' | 'medium' | 'high';
  default_status: 'open' | 'in_progress' | 'mitigated' | 'closed';
};

function getLocalizedTitle(tpl: RiskTemplate, lang: 'de' | 'en' | 'sv'): string {
  return (lang === 'sv' ? tpl.title_sv : lang === 'en' ? tpl.title_en : tpl.title_de) || tpl.title_en || tpl.title_de || tpl.code;
}

interface RiskTemplateSelectProps {
  value?: string;
  onSelect: (template: RiskTemplate | null) => void;
  disabled?: boolean;
}

export function RiskTemplateSelect({ value, onSelect, disabled }: RiskTemplateSelectProps) {
  const { i18n, t } = useTranslation(['nis2', 'common']);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<RiskTemplate[]>([]);

  const lang = (i18n.resolvedLanguage || 'de').slice(0, 2) as 'de' | 'en' | 'sv';

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('risk_templates')
        .select('*')
        .order('title_de');
      
      if (error) {
        toast.error(t('common:errorLoading', 'Fehler beim Laden der Vorlagen'));
        return;
      }
      
      if (data) {
        setTemplates(data as RiskTemplate[]);
      }
    };

    fetchTemplates();
  }, [t]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || t('nis2:form.templatePlaceholder', 'Vorlage wählen (optional)...')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-background z-50" align="start">
        <Command>
          <CommandInput 
            placeholder={t('common:search', 'Suchen...') as string}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>{t('common:noResults', 'Keine Ergebnisse')}</CommandEmpty>
            {templates.map((template) => {
              const localizedTitle = getLocalizedTitle(template, lang);
              return (
                <CommandItem
                  key={template.id}
                  value={`${template.code} ${localizedTitle}`}
                  onSelect={() => {
                    onSelect(template);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === localizedTitle ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{localizedTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {template.code} • {template.default_level}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
            <CommandItem
              onSelect={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="border-t"
            >
              <span className="italic text-muted-foreground">
                {t('nis2:form.customRisk', 'Eigene Formulierung verwenden')}
              </span>
            </CommandItem>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
