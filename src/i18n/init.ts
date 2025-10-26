import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from '@/lib/i18n';

type Lang = 'de' | 'en' | 'sv';
const SUPPORTED: Lang[] = ['de', 'en', 'sv'];
const resources = {
  de: translations.de,
  en: translations.en,
  sv: translations.sv,
};
const BOOT_LNG: Lang = (localStorage.getItem('i18nextLng') as Lang) || 'de';

const g = globalThis as any;
if (!g.__i18n_singleton__) {
  g.__i18n_singleton__ = i18n.use(initReactI18next).init({
    lng: BOOT_LNG,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED,
    ns: [...Object.keys(translations.de), 'training'],
    defaultNS: 'common',
    resources,
    load: 'currentOnly',
    react: { useSuspense: false, bindI18n: 'languageChanged' },
    interpolation: { escapeValue: false },
    cleanCode: true,
    nonExplicitSupportedLngs: true,
    returnEmptyString: false,
    returnNull: false,
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
