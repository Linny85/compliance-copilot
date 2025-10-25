// Alle EU- und EFTA-Sprachen (24 + 2)
export const supportedLocales = [
  'bg', // Bulgarisch
  'hr', // Kroatisch
  'cs', // Tschechisch
  'da', // Dänisch
  'nl', // Niederländisch
  'en', // Englisch
  'et', // Estnisch
  'fi', // Finnisch
  'fr', // Französisch
  'de', // Deutsch
  'el', // Griechisch
  'hu', // Ungarisch
  'ga', // Irisch
  'it', // Italienisch
  'lv', // Lettisch
  'lt', // Litauisch
  'mt', // Maltesisch
  'pl', // Polnisch
  'pt', // Portugiesisch
  'ro', // Rumänisch
  'sk', // Slowakisch
  'sl', // Slowenisch
  'es', // Spanisch
  'sv', // Schwedisch
  'is', // Isländisch
  'no', // Norwegisch
] as const;

export type Locale = typeof supportedLocales[number];

// Akzeptiert Varianten (de-AT, fr-BE, en-US usw.)
export const aliasMap: Record<string, Locale> = {
  bg: 'bg', hr: 'hr', cs: 'cs', da: 'da', nl: 'nl',
  en: 'en', 'en-gb': 'en', 'en-us': 'en',
  et: 'et', fi: 'fi', fr: 'fr', 'fr-fr': 'fr', 'fr-be': 'fr', 'fr-lu': 'fr',
  de: 'de', 'de-de': 'de', 'de-at': 'de', 'de-ch': 'de', 'de-li': 'de',
  el: 'el', hu: 'hu', ga: 'ga', it: 'it', lv: 'lv', lt: 'lt',
  mt: 'mt', pl: 'pl', pt: 'pt', 'pt-pt': 'pt', 'pt-br': 'pt',
  ro: 'ro', sk: 'sk', sl: 'sl', es: 'es', 'es-es': 'es', 'es-mx': 'es',
  sv: 'sv', 'sv-se': 'sv', is: 'is', 'is-is': 'is',
  no: 'no', nb: 'no', nn: 'no'
};

// Language labels for UI
export const localeLabels: Record<string, string> = {
  bg: 'Български (BG)', hr: 'Hrvatski (HR)', cs: 'Čeština (CS)',
  da: 'Dansk (DA)', nl: 'Nederlands (NL)', en: 'English (EN)',
  et: 'Eesti (ET)', fi: 'Suomi (FI)', fr: 'Français (FR)',
  de: 'Deutsch (DE)', el: 'Ελληνικά (EL)', hu: 'Magyar (HU)',
  ga: 'Gaeilge (GA)', it: 'Italiano (IT)', lv: 'Latviešu (LV)',
  lt: 'Lietuvių (LT)', mt: 'Malti (MT)', pl: 'Polski (PL)',
  pt: 'Português (PT)', ro: 'Română (RO)', sk: 'Slovenčina (SK)',
  sl: 'Slovenščina (SL)', es: 'Español (ES)', sv: 'Svenska (SV)',
  is: 'Íslenska (IS)', no: 'Norsk (NO)'
};

// RTL languages (for future expansion)
export const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

export function normalizeLocale(input: string | null | undefined): Locale {
  const key = String(input || '').toLowerCase();
  return aliasMap[key] ?? 'en';
}
