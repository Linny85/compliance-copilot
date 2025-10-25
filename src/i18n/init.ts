import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { supportedLocales, fallbackLng } from './languages';

const LS_KEY = 'lang'; // Consistent key for language preference

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: supportedLocales,
    fallbackLng,
    load: 'currentOnly', // More efficient than 'languageOnly'
    lowerCaseLng: true,
    nonExplicitSupportedLngs: true,
    ns: ['common', 'dashboard', 'documents', 'nav', 'sectors', 'controls', 'scope', 'evidence', 'checks'],
    defaultNS: 'common',
    backend: {
      loadPath: `${import.meta.env.BASE_URL || '/'}locales/{{lng}}/{{ns}}.json`,
    },
    detection: {
      order: ['localStorage', 'querystring'], // localStorage first, no browser detection
      lookupQuerystring: 'lng',
      lookupLocalStorage: LS_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable suspense for Lovable preview compatibility
    },
    returnEmptyString: false,
    saveMissing: false,
    initImmediate: false, // Synchronous initialization prevents flicker
  });

// Normalize language codes (nb/nn -> no, etc.)
const normalize = (lng: string) => ({
  'nb': 'no', 'nn': 'no',
}[lng] ?? lng);

const origChange = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (lng, ...rest) => origChange(normalize(lng), ...rest);

export default i18n;
