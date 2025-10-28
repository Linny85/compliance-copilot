import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

const buildId = (globalThis as any).__I18N_BUILD_ID__ ?? Date.now();

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'de',
    debug: true, // Enable debug to see what's happening
    ns: ['common', 'dashboard', 'documents', 'billing', 'nis2', 'checks', 'controls', 'admin', 'helpbot', 'training', 'assistant', 'aiSystems', 'aiAct', 'evidence', 'scope', 'nav'],
    defaultNS: 'common',
    preload: ['de', 'en', 'sv'],
    load: 'currentOnly',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      allowMultiLoading: false,
      crossDomain: false
    },
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    saveMissing: false,
    react: {
      useSuspense: false
    },
    parseMissingKeyHandler: (key) => {
      console.warn('[i18n] missing key:', key);
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
