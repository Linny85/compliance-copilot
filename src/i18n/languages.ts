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

// RTL languages (for future expansion)
export const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
