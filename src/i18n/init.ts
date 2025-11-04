import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

const buildId = (globalThis as any).__I18N_BUILD_ID__ ?? Date.now();
const DEV = import.meta.env.DEV;

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'de',
    debug: import.meta.env.DEV,
    ns: ['common', 'dashboard', 'documents', 'billing', 'nis2', 'checks', 'controls', 'admin', 'helpbot', 'norrly', 'training', 'assistant', 'aiSystems', 'aiAct', 'evidence', 'scope', 'nav', 'reports', 'ops', 'organization', 'audit', 'incidents'],
    defaultNS: 'common',
    preload: ['de', 'en', 'sv'],
    load: 'currentOnly',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json?v=20251104-3',
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

// DEV fallback for incidents namespace
const INCIDENTS_FALLBACK = {
  form: {
    incident: {
      title: "Titel des Vorfalls *",
      titlePlaceholder: "z. B. Unbefugter Zugriff auf Kundendaten",
      searchOrType: "Suchen oder eigenen Titel eingeben…",
      useEntered: '"{{text}}" verwenden',
      templates: [
        "Unbefugter Zugriff auf Kundendaten",
        "Kontoübernahme / kompromittiertes Administratorkonto",
        "Datenexfiltration",
        "Cloud-Fehlkonfiguration mit Datenfreigabe",
        "Phishing mit erfolgreichem Login",
        "Ransomware-Befall mit Systemverschlüsselung",
        "DDoS-Attacke auf Produktivsysteme",
        "Kritischer Dienst-/Systemausfall",
        "Ausfall eines kritischen Drittanbieters",
        "Malware-Ausbruch im Unternehmensnetz",
        "Ausnutzung einer kritischen Schwachstelle",
        "Manipulation kritischer Konfiguration",
        "Kompromittiertes Code-Repository (Supply Chain)",
        "SQL-Injection / Web-Exploit",
        "Diebstahl/Verlust unverschlüsselter Geräte",
        "Fehlversand / Fehlberechtigung",
        "Insider-Vorfall"
      ]
    }
  }
};

const lang = i18n.language || 'de';
if (!i18n.hasResourceBundle(lang, 'incidents')) {
  i18n.addResourceBundle(lang, 'incidents', INCIDENTS_FALLBACK, true, true);
  if (DEV) console.debug('[i18n] injected DEV incidents fallback for', lang);
}

export default i18n;
