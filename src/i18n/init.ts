import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

const DEV = import.meta.env.DEV;

// Add DEV-only fetch tracer to catch 404/HTML responses
if (DEV && !('__I18N_FETCH_TRACER__' in window)) {
  // @ts-ignore
  window.__I18N_FETCH_TRACER__ = true;
  const origFetch = window.fetch;
  window.fetch = async (input, init) => {
    const res = await origFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
      if (/\/locales\/.+\.json/.test(url)) {
        console.debug('[i18n] fetch', res.status, url);
      }
    } catch {}
    return res;
  };
}

// Build absolute URL for locale files (works from any nested route)
const ABS_BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '/');
const loadPathFn = (lng: string, ns: string) =>
  new URL(`${ABS_BASE}locales/${lng}/${ns}.json`, window.location.origin).toString();

// DEV fallback resources to prevent "not loaded" warnings
const devResources = DEV ? {
  de: {
    common: {
      tenant: {
        label: 'Mandant',
        loading: 'Lädt…',
        choose: 'Bitte wählen',
        none: 'Kein Mandant gewählt',
        missingTitle: 'Kein Mandant ausgewählt',
        missingDesc: 'Bitte wählen Sie einen Mandanten, um Daten zu laden.'
      }
    },
    dashboard: {
      labels: { ai_act: 'EU AI Act', gdpr: 'DSGVO', nis2: 'NIS2' },
      sections: { controls: 'Kontrollen', evidence: 'Nachweise', trainings: 'Schulungen' },
      training: { missing_data: 'Keine Daten' }
    }
  },
  en: {
    common: {
      tenant: {
        label: 'Tenant',
        loading: 'Loading…',
        choose: 'Please select',
        none: 'No tenant selected',
        missingTitle: 'No tenant selected',
        missingDesc: 'Please choose a tenant to load data.'
      }
    },
    dashboard: {
      labels: { ai_act: 'EU AI Act', gdpr: 'GDPR', nis2: 'NIS2' },
      sections: { controls: 'Controls', evidence: 'Evidence', trainings: 'Trainings' },
      training: { missing_data: 'No data' }
    }
  },
  sv: {
    common: {
      tenant: {
        label: 'Tenant',
        loading: 'Laddar…',
        choose: 'Välj',
        none: 'Ingen tenant vald',
        missingTitle: 'Ingen tenant vald',
        missingDesc: 'Välj en tenant för att läsa in data.'
      }
    },
    dashboard: {
      labels: { ai_act: 'EU AI Act', gdpr: 'GDPR', nis2: 'NIS2' },
      sections: { controls: 'Kontroller', evidence: 'Bevis', trainings: 'Utbildningar' },
      training: { missing_data: 'Ingen data' }
    }
  }
} : undefined;

// Singleton guard to prevent double initialization
if (!i18n.isInitialized) {
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
      loadPath: loadPathFn,
      queryStringParams: {
        v: import.meta.env.DEV ? String(Date.now()) : '2025-11-07b'
      },
      allowMultiLoading: false,
      crossDomain: false,
      requestOptions: { cache: 'no-store' },
      parse: (data: string, languages?: string | string[], namespaces?: string | string[]) => {
        const trimmed = data.trim();
        const looksHTML = /^<!doctype html/i.test(trimmed) || /^</.test(trimmed);
        
        if (looksHTML) {
          if (import.meta.env.DEV) {
            console.error('[i18n] HTML received instead of JSON', {
              languages: typeof languages === 'string' ? languages : languages?.[0],
              namespaces: typeof namespaces === 'string' ? namespaces : namespaces?.[0],
              hint: 'Check absolute loadPath / public/locales structure / dev proxy.'
            });
            console.error('[i18n] First 200 chars:', trimmed.slice(0, 200));
          }
          return {};
        }
        
        try {
          return JSON.parse(data);
        } catch (e) {
          if (import.meta.env.DEV) {
            console.error('[i18n] JSON parse failed:', {
              languages: typeof languages === 'string' ? languages : languages?.[0],
              namespaces: typeof namespaces === 'string' ? namespaces : namespaces?.[0],
              error: e instanceof Error ? e.message : String(e),
            });
            console.error('[i18n] First 200 chars:', trimmed.slice(0, 200));
          }
          return {};
        }
      }
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    saveMissing: false,
    resources: devResources,
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
}

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
