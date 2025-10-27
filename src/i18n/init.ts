import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

const buildId = (globalThis as any).__I18N_BUILD_ID__ ?? Date.now();

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'de',
    debug: false,
    ns: ['common', 'dashboard', 'documents', 'billing', 'nis2', 'checks', 'controls', 'admin', 'helpbot', 'training', 'assistant', 'aiSystems', 'evidence', 'scope', 'nav'],
    defaultNS: 'common',
    preload: ['de', 'en', 'sv'],
    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${buildId}`
    },
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    saveMissing: true,
    parseMissingKeyHandler: (key) => {
      console.warn('[i18n] missing key:', key);
      return key;
    },
  });

// Set lang attribute on HTML root for proper hyphenation
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng?.slice(0, 2) || 'de';
});
// Set initial lang
document.documentElement.lang = i18n.language?.slice(0, 2) || 'de';

export default i18n;
