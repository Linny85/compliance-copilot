import i18n, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { supportedLocales, fallbackLng } from './languages';

const LS_KEY = 'lang'; // Single source of truth

// 1) Migrate legacy key if present
const legacy = localStorage.getItem('i18nextLng');
if (legacy && !localStorage.getItem(LS_KEY)) {
  localStorage.setItem(LS_KEY, legacy);
}

// 2) Read initial language (single source, no detector needed)
const storedLng = localStorage.getItem(LS_KEY);
const initialLng = supportedLocales.includes(storedLng as any) ? storedLng : fallbackLng;

// 3) Build bundled resources for all supported locales
const resources: Record<string, Record<string, Record<string, any>>> = {};
supportedLocales.forEach(locale => {
  resources[locale] = {
    common: {},
    dashboard: {},
    documents: {},
    sectors: {},
    nav: {},
    controls: {},
    scope: {},
    evidence: {},
    checks: {},
  };
});

// 4) Singleton protection (critical for preview/HMR)
const g = globalThis as any;
let instance: I18nInstance;

if (g.__i18n_instance) {
  instance = g.__i18n_instance as I18nInstance;
} else {
  instance = i18n.use(initReactI18next);

  if (!instance.isInitialized) {
    instance.init({
      lng: initialLng,                        // Fixed initial language (no detector!)
      fallbackLng,
      supportedLngs: supportedLocales,
      load: 'currentOnly',
      lowerCaseLng: true,
      nonExplicitSupportedLngs: true,
      
      resources,                              // Bundled resources (no HTTP backend)
      ns: ['common', 'dashboard', 'documents', 'nav', 'sectors', 'controls', 'scope', 'evidence', 'checks'],
      defaultNS: 'common',
      fallbackNS: 'common',
      
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

// 5) Sync HTML lang attribute
const setHtmlLang = (lng: string) => {
  if (document?.documentElement?.lang !== lng) {
    document.documentElement.lang = lng;
  }
};
setHtmlLang(initialLng!);
instance.on('languageChanged', setHtmlLang);

export default instance;
