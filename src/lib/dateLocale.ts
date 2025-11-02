import { de, enGB, sv } from 'date-fns/locale';
import type { Locale } from 'date-fns';

const localeMap: Record<string, Locale> = {
  de,
  en: enGB,
  sv,
};

/**
 * Returns the date-fns locale object for the given language code.
 * Falls back to German (de) if the language is not supported.
 */
export function getDateFnsLocale(language: string): Locale {
  const lang = language.split('-')[0].toLowerCase();
  return localeMap[lang] || de;
}
