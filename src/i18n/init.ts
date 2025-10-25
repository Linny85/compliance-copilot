import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { supportedLocales, fallbackLng } from './languages';

const LS_KEY = 'lang'; // Consistent key for language preference

// Bundled resources to prevent HTTP requests and 404 loops
const resources = {
  de: {
    common: {},
    dashboard: {},
    documents: {},
    sectors: {},
    nav: {},
    controls: {},
    scope: {},
    evidence: {},
    checks: {},
  },
  sv: {
    common: {},
    dashboard: {},
    documents: {},
    sectors: {},
    nav: {},
    controls: {},
    scope: {},
    evidence: {},
    checks: {},
  },
};

// ---- Singleton protection (critical for preview/HMR) ----
const g = globalThis as any;
let instance: I18nInstance;

if (g.__i18n_instance) {
  instance = g.__i18n_instance as I18nInstance;
} else {
  instance = i18n
    .use(LanguageDetector)
    .use(initReactI18next);

  if (!instance.isInitialized) {
    instance.init({
      resources,
      supportedLngs: supportedLocales,
      fallbackLng,
      load: 'currentOnly',
      lowerCaseLng: true,
      nonExplicitSupportedLngs: true,
      ns: ['common', 'dashboard', 'documents', 'nav', 'sectors', 'controls', 'scope', 'evidence', 'checks'],
      defaultNS: 'common',
      fallbackNS: 'common',
      
      // CRITICAL: Single source of truth - only localStorage
      detection: {
        order: ['localStorage'],              // Only localStorage, no navigator/htmlTag
        caches: ['localStorage'],
        lookupLocalStorage: LS_KEY,
      },
      
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,                   // Prevent suspense flickering
        bindI18n: 'languageChanged',          // Only bind to language change
      },
      returnEmptyString: false,
      saveMissing: false,
      initImmediate: false,                   // Synchronous init prevents flicker
      partialBundledLanguages: true,          // Load available keys without loop
    });
  }

  g.__i18n_instance = instance;
}

export default instance;
