import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from '@/lib/i18n';

type Lang = 'en' | 'de' | 'sv' | 'da' | 'no' | 'fi' | 'is' | 'fr' | 'it' | 'es' | 'pt' | 'ro' | 'ca' | 'nl' | 'pl' | 'cs' | 'sk' | 'sl' | 'hr' | 'hu' | 'bg' | 'el' | 'et' | 'lv' | 'lt' | 'ga' | 'mt';
const SUPPORTED: Lang[] = ['en', 'de', 'sv', 'da', 'no', 'fi', 'is', 'fr', 'it', 'es', 'pt', 'ro', 'ca', 'nl', 'pl', 'cs', 'sk', 'sl', 'hr', 'hu', 'bg', 'el', 'et', 'lv', 'lt', 'ga', 'mt'];

// Build resources object dynamically with all supported languages
const resources = SUPPORTED.reduce((acc, lang) => {
  acc[lang] = (translations as any)[lang] || translations.en;
  return acc;
}, {} as Record<Lang, any>);
const BOOT_LNG: Lang = (localStorage.getItem('i18nextLng') as Lang) || 'de';

const g = globalThis as any;
if (!g.__i18n_singleton__) {
  g.__i18n_singleton__ = i18n.use(initReactI18next).init({
    lng: BOOT_LNG,
    fallbackLng: 'de',
    supportedLngs: SUPPORTED,
    ns: Object.keys(translations.de),
    defaultNS: 'common',
    resources,
    load: 'currentOnly',
    react: { useSuspense: false, bindI18n: 'languageChanged' },
    interpolation: { escapeValue: false },
    cleanCode: true,
    nonExplicitSupportedLngs: true,
    returnEmptyString: false,
    initImmediate: false,
  });
}

// Runtime tripwire: log language changes for debugging
const orig = i18n.changeLanguage.bind(i18n);
(i18n as any).changeLanguage = (next: string) => {
  console.warn('[i18n] changeLanguage called →', next);
  return orig(next);
};

export const i18nReady = g.__i18n_singleton__;
export default i18n;
