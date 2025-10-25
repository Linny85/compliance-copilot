import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { supportedLocales, fallbackLng } from './languages';

const LS_KEY = 'lang'; // Consistent key for language preference

// Bundled resources to prevent HTTP requests
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
      detection: {
        order: ['localStorage'],
        caches: ['localStorage'],
        lookupLocalStorage: LS_KEY,
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
        bindI18n: '', // Prevent additional re-renders
      },
      returnEmptyString: false,
      saveMissing: false,
      initImmediate: false,
    });
  }

  // Fix stored language immediately after init
  const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
  if (stored && stored !== instance.language) {
    instance.changeLanguage(stored);
  }

  g.__i18n_instance = instance;
}

// Normalize language codes (nb/nn -> no, etc.)
const normalize = (lng: string) => ({
  'nb': 'no', 'nn': 'no',
}[lng] ?? lng);

// Only patch if not already patched
if (!instance.changeLanguage.toString().includes('normalize')) {
  const origChange = instance.changeLanguage.bind(instance);
  instance.changeLanguage = (lng, ...rest) => origChange(normalize(lng), ...rest);
}

export default instance;
