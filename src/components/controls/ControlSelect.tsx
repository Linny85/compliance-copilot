import * as React from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

type Control = { id: string; code: string; title: string };

type Props = {
  value?: string | null;
  onChange: (id: string | null, item?: Control) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function ControlSelect({ value, onChange, placeholder, disabled }: Props) {
  const { t } = useTranslation(["checks"]);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<Control[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchItems = React.useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-controls", {
        body: { q, page: 1, pageSize: 20 }
      });
      if (error) throw error;
      setItems(data?.items || []);
    } catch (e) {
      console.error('[ControlSelect] Fetch error:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, fetchItems]);

  const selected = items.find(i => i.id === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selected ? `${selected.code}: ${selected.title}` : (placeholder || t("checks:form.placeholders.control_id"))}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0">
        <Command>
          <Input
            autoFocus
            placeholder={t("checks:form.placeholders.control_id") || "Search controls"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
          <CommandList>
            {loading ? null : <CommandEmpty>{t("checks:empty.noResults") || "No results"}</CommandEmpty>}
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.id}
                  onSelect={() => {
                    onChange(it.id, it);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{it.code}</span>
                    <span className="text-xs text-muted-foreground">{it.title}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
