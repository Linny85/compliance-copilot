import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { supportedLocales, normalizeLocale } from './languages';

// Alte Keys übernehmen, falls vorhanden
const legacy = localStorage.getItem('i18nextLng');
if (legacy && !localStorage.getItem('lang')) localStorage.setItem('lang', legacy);

// Initialsprache stabilisieren
const initialLng = normalizeLocale(localStorage.getItem('lang'));

const resources: Record<string, any> = {};
for (const locale of supportedLocales) {
  resources[locale] = {
    common: {}, dashboard: {}, documents: {}, onboarding: {},
  };
}

i18n.use(initReactI18next).init({
  lng: initialLng,
  fallbackLng: 'en',
  supportedLngs: supportedLocales as unknown as string[],
  resources,
  ns: ['common', 'dashboard', 'documents', 'onboarding'],
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  initImmediate: false,
  partialBundledLanguages: true,
});

export default i18n;
