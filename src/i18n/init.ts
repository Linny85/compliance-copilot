import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Fix language at boot to avoid detector ping-pong
const BOOT_LNG =
  (localStorage.getItem('lang') as 'de' | 'en' | 'sv' | null) || 'de';

export const i18nReady = i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: BOOT_LNG,
    fallbackLng: 'de',
    supportedLngs: ['en', 'de', 'sv', 'da', 'no', 'fi', 'is', 'nl', 'fr', 'es', 'it', 'pt', 'pl', 'cs', 'sk', 'sl', 'hr', 'ro', 'bg', 'el', 'et', 'lv', 'lt', 'mt', 'ga', 'hu', 'ca'],
    ns: ['common', 'nav', 'dashboard', 'documents', 'checks', 'controls', 'evidence', 'scope', 'sectors'],
    defaultNS: 'common',
    load: 'currentOnly',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Bind languageChanged event once globally
const g = globalThis as any;
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
