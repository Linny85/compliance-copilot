import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Fix language at boot to avoid detector ping-pong
const BOOT_LNG =
  (localStorage.getItem('i18nextLng') as 'de' | 'en' | 'sv' | null) || 'de';

export const i18nReady = i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: BOOT_LNG,
    fallbackLng: 'de',
    supportedLngs: ['de', 'en', 'sv'],
    ns: ['common', 'nav', 'dashboard', 'documents', 'checks', 'controls', 'evidence', 'scope', 'sectors'],
    defaultNS: 'common',
    load: 'currentOnly',
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
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
