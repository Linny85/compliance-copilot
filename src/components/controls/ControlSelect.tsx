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
  const [selected, setSelected] = React.useState<Control | null>(null);

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

  // Hydrate selected control by id on mount or value change
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!value) { 
        setSelected(null); 
        return; 
      }
      try {
        const { data, error } = await supabase.functions.invoke("search-controls", { 
          body: { id: value } 
        });
        if (!active) return;
        if (error) throw error;
        const item = (data?.items || [])[0] || null;
        setSelected(item);
        // Enrich items list if not already present
        if (item && !items.find(i => i.id === item.id)) {
          setItems(prev => [item, ...prev]);
        }
      } catch (e) {
        console.error('[ControlSelect] Hydrate error:', e);
        if (active) setSelected(null);
      }
    })();
    return () => { active = false; };
  }, [value]);

  // Debounce search (min 2 chars)
  React.useEffect(() => {
    const effectiveQ = query.length >= 2 ? query : "";
    const timer = setTimeout(() => {
      fetchItems(effectiveQ);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, fetchItems]);

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
            {loading ? (
              <CommandEmpty>{t("common:loading") || "Loading..."}</CommandEmpty>
            ) : (
              <CommandEmpty>{t("checks:empty.noResults") || "No results"}</CommandEmpty>
            )}
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.id}
                  onSelect={() => {
                    onChange(it.id, it);
                    setSelected(it);
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
