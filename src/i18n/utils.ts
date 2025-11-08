import i18n from './init';

// Format utilities using Intl API
export const fmt = {
  date(d: Date, locale: string, options?: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(locale, options || { dateStyle: 'medium' }).format(d);
  },
  
  number(n: number, locale: string, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locale, options).format(n);
  },
  
  currency(amount: number, locale: string, currency: string = 'EUR') {
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency 
    }).format(amount);
  },
};

// i18n utilities
export function nsReady(ns: string | string[]): boolean {
  if (!i18n.isInitialized) return false;
  const arr = Array.isArray(ns) ? ns : [ns];
  return arr.every(n => i18n.hasLoadedNamespace(n));
}

export function ensureNs(ns: string | string[]): Promise<void> {
  const arr = Array.isArray(ns) ? ns : [ns];
  return i18n.loadNamespaces(arr);
}

export async function setLocale(lng: string): Promise<void> {
  localStorage.setItem('lng', lng);
  await i18n.changeLanguage(lng);
}

export function getStoredLocale(): string | null {
  return localStorage.getItem('lng');
}
