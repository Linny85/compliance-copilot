import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const DEFAULT_TITLES = [
  "Unbefugter Zugriff auf Kundendaten",
  "Kontoübernahme / kompromittiertes Administratorkonto",
  "Datenexfiltration",
  "Cloud-Fehlkonfiguration mit Datenfreigabe",
  "Phishing mit erfolgreichem Login",
  "Ransomware-Befall mit Systemverschlüsselung",
  "DDoS-Attacke auf Produktivsysteme",
  "Kritischer Dienst-/Systemausfall",
  "Ausfall eines kritischen Drittanbieters",
  "Malware-Ausbruch im Unternehmensnetz",
  "Ausnutzung einer kritischen Schwachstelle",
  "Manipulation kritischer Konfiguration",
  "Kompromittiertes Code-Repository (Supply Chain)",
  "SQL-Injection / Web-Exploit",
  "Diebstahl/Verlust unverschlüsselter Geräte",
  "Fehlversand / Fehlberechtigung",
  "Insider-Vorfall",
];

function toStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string").map(s => s.trim()).filter(Boolean);
  if (typeof raw === "string") {
    const maybeSplit = raw.includes("|") ? raw.split("|") : [raw];
    return maybeSplit.map(s => s.trim()).filter(Boolean);
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw)
      .filter((v): v is string => typeof v === "string")
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

export default function IncidentTitleCombobox({
  value, onChange, placeholder
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { t, i18n } = useTranslation(["incidents"]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  if (import.meta.env.DEV) {
    console.debug('[i18n:bundles]', {
      lang: i18n.language,
      hasIncidents: i18n.hasResourceBundle(i18n.language, 'incidents')
    });
  }

  const options: string[] = useMemo(() => {
    const raw = t("form.incident.templates", { returnObjects: true });
    const list = toStringArray(raw);
    const normalized = list.length ? list : DEFAULT_TITLES;
    if (import.meta.env.DEV) {
      console.debug("[incident:title QA]", {
        lang: i18n.language,
        hasIncidents: i18n.hasResourceBundle(i18n.language, 'incidents'),
        count: options.length || normalized.length,
        sample: (options.length ? options : normalized).slice(0, 3),
      });
      console.debug("[incident:title:options]", { raw, normalized });
    }
    return normalized;
  }, [t, i18n]);

  const apply = (v: string) => {
    const s = (v ?? "").trim();
    if (!s) return;
    onChange(s);
    setOpen(false);
    if (import.meta.env.DEV) console.debug("[incident:title] set", s);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter(o => o.toLowerCase().includes(query));
  }, [q, options]);

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{t("form.incident.title")}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className={value ? "" : "text-muted-foreground"}>
              {value || (placeholder || (t("form.incident.titlePlaceholder") as string))}
            </span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[420px]">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("form.incident.searchOrType") as string}
              value={q}
              onValueChange={setQ}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim()) apply(q);
              }}
            />
            <CommandList>
              <CommandEmpty>
                <Button variant="ghost" onClick={() => apply(q)} disabled={!q.trim()}>
                  {t("form.incident.useEntered", { text: q || "…" }) as string}
                </Button>
              </CommandEmpty>
              {filtered.map((opt) => (
                <CommandItem key={opt} onSelect={() => apply(opt)}>
                  {opt}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
