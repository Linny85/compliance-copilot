// Supported locales (EU + EWR pack)
export const fallbackLng = 'en';

export const supportedLocales = [
  'en', 'de', 'sv', 'da', 'no', 'fi', 'is',
  'fr', 'it', 'es', 'pt', 'ro', 'ca',
  'nl', 'pl', 'cs', 'sk', 'sl', 'hr',
  'hu', 'bg', 'el',
  'et', 'lv', 'lt',
  'ga', 'mt'
] as const;

export type Locale = typeof supportedLocales[number];

// Language labels for UI
export const localeLabels: Record<string, string> = {
  en: 'English (EN)', de: 'Deutsch (DE)', sv: 'Svenska (SV)',
  da: 'Dansk (DA)', no: 'Norsk (NO)', fi: 'Suomi (FI)', is: 'Íslenska (IS)',
  fr: 'Français (FR)', it: 'Italiano (IT)', es: 'Español (ES)',
  pt: 'Português (PT)', ro: 'Română (RO)', ca: 'Català (CA)',
  nl: 'Nederlands (NL)', pl: 'Polski (PL)', cs: 'Čeština (CS)',
  sk: 'Slovenčina (SK)', sl: 'Slovenščina (SL)', hr: 'Hrvatski (HR)',
  hu: 'Magyar (HU)', bg: 'Български (BG)', el: 'Ελληνικά (EL)',
  et: 'Eesti (ET)', lv: 'Latviešu (LV)', lt: 'Lietuvių (LT)',
  ga: 'Gaeilge (GA)', mt: 'Malti (MT)'
};

// RTL languages (for future expansion)
export const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
