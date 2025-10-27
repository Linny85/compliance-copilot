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
    ns: ['common','dashboard','documents','nis2','checks','controls','admin','helpbot'],
    defaultNS: 'common',
    preload: ['de','en','sv'],
    backend: { loadPath: `/locales/{{lng}}/{{ns}}.json?v=${buildId}` },
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    saveMissing: true,
    parseMissingKeyHandler: (key) => { 
      console.warn('[i18n] missing key:', key); 
      return key; 
    }
  });

export default i18n;
