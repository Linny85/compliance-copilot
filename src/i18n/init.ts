import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { supportedLocales, fallbackLng } from './languages';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: supportedLocales,
    fallbackLng,
    load: 'languageOnly', // 'de-AT' → 'de'
    lowerCaseLng: true,
    nonExplicitSupportedLngs: true,
    ns: ['common', 'dashboard', 'documents', 'nav', 'sectors'],
    defaultNS: 'common',
    backend: {
      loadPath: `${import.meta.env.BASE_URL || '/'}locales/{{lng}}/{{ns}}.json`,
    },
    detection: {
      order: ['querystring', 'localStorage', 'cookie', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      caches: ['localStorage', 'cookie'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable suspense for Lovable preview compatibility
    },
    returnEmptyString: false,
    saveMissing: false,
  });

// Normalize language codes (nb/nn -> no, etc.)
const normalize = (lng: string) => ({
  'nb': 'no', 'nn': 'no',
}[lng] ?? lng);

const origChange = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (lng, ...rest) => origChange(normalize(lng), ...rest);

export default i18n;
