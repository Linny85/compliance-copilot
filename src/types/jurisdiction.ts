export type Jurisdiction = {
  iso2: string;         // "SE"
  iso3: string;         // "SWE"
  name_en: string;
  name_de: string;
  name_sv: string;
  dpa_name: string;     // offizielle/übliche Bezeichnung
  dpa_abbrev?: string;  // z.B. "IMY", "CNIL"
  dpa_url?: string;     // optional
  national_law?: string; // Kurzbezeichnung des nationalen DSG
  note?: string;        // optionale Zusatznotiz
};
