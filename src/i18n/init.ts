import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

const BUILD_ID = import.meta.env?.VITE_BUILD_ID ?? '20251101';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'de',
    supportedLngs: ['de', 'en', 'sv'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    lowerCaseLng: true,
    cleanCode: true,
    debug: import.meta.env.DEV,
    ns: ['norrly', 'common', 'dashboard', 'documents', 'billing', 'nis2', 'checks', 'controls', 'admin', 'helpbot', 'training', 'assistant', 'aiSystems', 'aiAct', 'evidence', 'scope', 'nav', 'reports', 'organization'],
    defaultNS: 'norrly',
    preload: ['de', 'en', 'sv'],
    backend: {
      loadPath: `locales/{{lng}}/{{ns}}.json?v=${BUILD_ID}`,
      allowMultiLoading: false,
      crossDomain: false
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    saveMissing: false,
    react: {
      useSuspense: false
    },
    parseMissingKeyHandler: (key) => {
      if (import.meta.env.DEV) {
        console.warn('[i18n missing]', key);
      }
      return key;
    },
  });

// Debug: Log when namespaces are loaded
i18n.on('loaded', (loaded) => {
  console.log('[i18n] Successfully loaded:', loaded);
});

// Debug: Log when language changes
i18n.on('languageChanged', (lng) => {
  console.log('[i18n] Language changed to:', lng);
  document.documentElement.lang = lng?.slice(0, 2) || 'de';
});
// Set initial lang
document.documentElement.lang = i18n.language?.slice(0, 2) || 'de';

export default i18n;
