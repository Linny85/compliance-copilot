import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function IncidentTitleCombobox({
  value, onChange, placeholder
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { t } = useTranslation(["incidents"]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const options: string[] = useMemo(
    () => (t("incidents:form.incident.templates", { returnObjects: true }) as string[]) || [],
    [t]
  );

  const apply = (v: string) => {
    const s = (v ?? "").trim();
    if (!s) return;
    onChange(s);
    setOpen(false);
    if (import.meta.env.DEV) console.debug("[incident:title] set", s);
  };

  const filtered = !q ? options : options.filter(o => o.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{t("incidents:form.incident.title")}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className={value ? "" : "text-muted-foreground"}>
              {value || (placeholder || t("incidents:form.incident.titlePlaceholder"))}
            </span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[420px]">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("incidents:form.incident.searchOrType") as string}
              value={q}
              onValueChange={setQ}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim()) apply(q);
              }}
            />
            <CommandList>
              <CommandEmpty>
                <Button variant="ghost" onClick={() => apply(q)} disabled={!q.trim()}>
                  {t("incidents:form.incident.useEntered", { text: q || "…" })}
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
