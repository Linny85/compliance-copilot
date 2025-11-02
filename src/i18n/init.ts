import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

const buildId = (globalThis as any).__I18N_BUILD_ID__ ?? Date.now();

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'de',
    debug: import.meta.env.DEV,
    ns: ['common', 'dashboard', 'documents', 'billing', 'nis2', 'checks', 'controls', 'admin', 'helpbot', 'norrly', 'training', 'assistant', 'aiSystems', 'aiAct', 'evidence', 'scope', 'nav', 'reports', 'organization'],
    defaultNS: 'common',
    preload: ['de', 'en', 'sv'],
    load: 'currentOnly',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
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
    resources: import.meta.env.DEV ? {
      de: { norrly: {
        'cta.auditList': 'Audit-Liste',
        'cta.auditNew': 'Neues Audit',
      }},
      en: { norrly: {
        'cta.auditList': 'Audit list',
        'cta.auditNew': 'New audit',
      }},
      sv: { norrly: {
        'cta.auditList': 'Revisionslista',
        'cta.auditNew': 'Ny revision',
      }},
    } : undefined
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
