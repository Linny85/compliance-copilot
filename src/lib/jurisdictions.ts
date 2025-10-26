import type { Jurisdiction } from "@/types/jurisdiction";
import { EU_JURISDICTIONS } from "@/data/eu_jurisdictions";

export const jurisdictionByIso2 = (iso2?: string): Jurisdiction | undefined =>
  iso2 ? EU_JURISDICTIONS.find(j => j.iso2 === iso2) : undefined;

export const labelByLocale = (j: Jurisdiction, locale: string) =>
  locale === "de" ? j.name_de : locale === "sv" ? j.name_sv : j.name_en;
