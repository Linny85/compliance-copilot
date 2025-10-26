import { EU_JURISDICTIONS } from "@/data/eu_jurisdictions";
import { labelByLocale } from "@/lib/jurisdictions";
import { useI18n } from "@/contexts/I18nContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value?: string;                   // iso2 (z. B. "SE")
  onChange: (iso2: string) => void;
  placeholderIso2?: string;         // optional default/empty
};

export default function JurisdictionSelect({ value, onChange, placeholderIso2 }: Props) {
  const { tx, language } = useI18n();
  const locale = language || "en";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">
        {tx("jurisdictions.selectLabel")}
      </label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={tx("jurisdictions.selectLabel")} />
        </SelectTrigger>
        <SelectContent>
          {EU_JURISDICTIONS.map(j => (
            <SelectItem key={j.iso2} value={j.iso2}>
              {labelByLocale(j, locale)}{tx("jurisdictions.suffix")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{tx("jurisdictions.hint")}</p>
    </div>
  );
}
