import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from '@/lib/i18n';

type Lang = 'de' | 'en' | 'sv';

// Build i18next resources from local translations object
function buildResources(t: Record<Lang, Record<string, any>>) {
  const out: Record<Lang, Record<string, any>> = { de: {}, en: {}, sv: {} };
  (Object.keys(t) as Lang[]).forEach((lng) => {
    Object.entries(t[lng] || {}).forEach(([ns, payload]) => {
      out[lng][ns] = payload;
    });
  });
  return out;
}

const SUPPORTED: Lang[] = ['de', 'en', 'sv'];
const resources = buildResources(translations);

// Read language once at boot from i18next standard key
const BOOT_LNG = (localStorage.getItem('i18nextLng') as Lang | null) || 'de';

// Singleton to prevent double-init
const g = globalThis as any;
if (!g.__i18n_singleton__) {
  g.__i18n_singleton__ = i18n
    .use(initReactI18next)
    .init({
      lng: BOOT_LNG,
      fallbackLng: 'de',
      supportedLngs: SUPPORTED,
      ns: Object.keys(translations.en),
      defaultNS: 'common',
      resources,
      load: 'currentOnly',
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged',
      },
      interpolation: {
        escapeValue: false,
      },
      cleanCode: true,
      nonExplicitSupportedLngs: true,
      returnEmptyString: false,
      initImmediate: false,
    });
}

export const i18nReady = g.__i18n_singleton__;

// Bind languageChanged event once globally
if (!g.__ni_i18nBound) {
  g.__ni_i18nBound = true;
  const setHtmlLang = (lng: string) => {
    if (document?.documentElement?.lang !== lng) {
      document.documentElement.lang = lng;
    }
  };
  i18nReady.then(() => setHtmlLang(i18n.language));
  i18n.on('languageChanged', setHtmlLang);
}

export default i18n;
