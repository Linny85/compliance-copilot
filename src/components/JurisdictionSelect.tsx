import { EU_JURISDICTIONS } from "@/data/eu_jurisdictions";
import { useI18n } from "@/contexts/I18nContext";
import type { Jurisdiction } from "@/types/jurisdiction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value?: string;              // iso2
  onChange: (iso2: string) => void;
};

const labelByLocale = (j: Jurisdiction, locale: string) =>
  locale === "de" ? j.name_de : locale === "sv" ? j.name_sv : j.name_en;

export default function JurisdictionSelect({ value, onChange }: Props) {
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
              {labelByLocale(j, locale)} {tx("jurisdictions.suffix")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{tx("jurisdictions.hint")}</p>
    </div>
  );
}
