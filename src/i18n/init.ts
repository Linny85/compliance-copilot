import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

const BUILD_ID =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_BUILD_ID) ||
  String(Date.now());

// KORREKTE Signatur: (languages[], namespaces[])
function resolveLocalesPath(languages: string[] | string, namespaces: string[] | string): string {
  const href = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
  const lng = Array.isArray(languages) ? (languages[0] || 'de') : (languages || 'de');
  const ns  = Array.isArray(namespaces) ? (namespaces[0] || 'norrly') : (namespaces || 'norrly');
  return new URL(`locales/${String(lng).toLowerCase()}/${ns}.json?v=${BUILD_ID}`, href).toString();
}

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
    ns: [
      'norrly','common','dashboard','documents','billing','nis2','checks','controls',
      'admin','helpbot','training','assistant','aiSystems','aiAct','evidence',
      'scope','nav','reports','organization'
    ],
    defaultNS: 'norrly',
    preload: ['de', 'en', 'sv'],
    // Wichtig: Multi-Loading erlaubt Arrays -> stabilere Pfad-Aufrufe
    backend: {
      loadPath: resolveLocalesPath,
      allowMultiLoading: true,
      crossDomain: false,
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    saveMissing: false,
    react: { useSuspense: false },
    parseMissingKeyHandler: (key) => {
      if (import.meta.env.DEV) console.warn('[i18n missing]', key);
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
