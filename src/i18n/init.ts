import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import { detectBrowserLocale } from './detect';
import { emitMissingKey } from './missingKeyBus';

const DEV = import.meta.env.DEV;

// Helper: converts flat JSON {"a.b": "x", "a.c": "y"} to nested {a:{b:"x", c:"y"}}
function toNested(obj: Record<string, any>): Record<string, any> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!k.includes('.')) {
      out[k] = v;
      continue;
    }
    const parts = k.split('.');
    let cur = out;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) {
        cur[p] = v;
      } else {
        cur[p] ??= {};
        cur = cur[p];
      }
    }
  }
  return out;
}

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

// Allow forced HTTP loading via env flag (bypasses dev fallback)
const FORCE_HTTP = import.meta.env.VITE_I18N_FORCE_HTTP === 'true';

// DEV fallback resources to prevent "not loaded" warnings
const devResources = (!FORCE_HTTP && DEV) ? {
  de: {
    common: {
      tenant: {
        label: 'Mandant',
        loading: 'Lädt…',
        choose: 'Bitte wählen',
        none: 'Kein Mandant gewählt',
        missingTitle: 'Kein Mandant ausgewählt',
        missingDesc: 'Bitte wählen Sie einen Mandanten, um Daten zu laden.'
      },
      loading: 'Lädt…'
    },
    norrly: {
      name: 'Norrly',
      header: { subtitle: 'Norrly – dein Kollege für Klarheit in NIS2 & AI Act.' },
      intro: { headline: 'Hi, ich bin Norrly', text: 'Ich helfe dir bei NIS2 & AI Act.' },
      input: { open: 'Öffnen', cancel: 'Abbrechen', loading: 'Lädt…' },
      voice: { on: 'Stimme an', off: 'Stimme aus' },
      session: { reset: 'Session zurücksetzen' },
      loading: 'Lädt…',
      welcome: 'Willkommen'
    },
    labels: { nis2: 'NIS2', ai_act: 'AI Act', gdpr: 'DSGVO' },
    sections: { controls: 'Kontrollen', evidence: 'Nachweise', trainings: 'Schulungen', dpia: 'DSFA' },
    training: { missing_data: 'Keine Trainingsdaten vorhanden.' },
    dashboard: {
      name: 'Dashboard',
      loading: 'Lädt…',
      welcome: 'Willkommen',
      labels: { ai_act: 'EU AI Act', gdpr: 'DSGVO', nis2: 'NIS2' },
      sections: { controls: 'Kontrollen', evidence: 'Nachweise', trainings: 'Schulungen', dpia: 'DSFA' },
      training: { missing_data: 'Keine Daten' },
      uploadEvidence: 'Nachweise hochladen',
      uploadEvidenceDesc: 'Lade Dokumente oder Screenshots als Nachweis hoch.',
      scheduleChecks: 'Prüfungen planen',
      scheduleChecksDesc: 'Lege Intervalle für automatische Checks fest.',
      addRisks: 'Risiken erfassen',
      addRisksDesc: 'Füge neue Risiken hinzu und verknüpfe Maßnahmen.',
      generatePolicy: 'Richtlinie generieren',
      generatePolicyDesc: 'Erzeuge Richtlinien auf Basis deiner Daten.',
      nextStepsHeader: 'Nächste Schritte',
      nextStepsSub: 'Starte hier, um schneller voranzukommen.',
      trialStatus: 'Teststatus',
      active: 'Aktiv',
      trialStatusDesc: 'Deine Testphase läuft.',
      daysRemaining: '{{count}} Tage verbleibend',
      upgradePlan: 'Plan upgraden',
      trialNote: 'Du kannst jederzeit upgraden.',
      organization: 'Organisation',
      organizationDesc: 'Stammdaten deiner Organisation.',
      companyName: 'Unternehmensname',
      country: 'Land',
      sector: 'Sektor',
      sectors: { it: 'IT', finance: 'Finanzen', health: 'Gesundheit' },
      viewOrganization: 'Organisation anzeigen',
      recentAuditReports: 'Aktuelle Audit-Berichte',
      recentAuditReportsDesc: 'Neueste Ergebnisse und Berichte.',
      viewAll: 'Alle ansehen',
      noReportsYet: 'Noch keine Berichte vorhanden.',
      complianceProgress: 'Compliance-Fortschritt',
      complianceOverall: 'Gesamt',
      complianceOverallDesc: 'Gesamtwert inkl. Teilbereiche.',
      complianceOverallTooltipWithTraining: 'Gesamtwertung inkl. Trainingsabdeckung.',
      complianceStatusNeeds: 'Erfordert Maßnahmen',
      createAuditTask: 'Audit-Aufgabe anlegen'
    },
    organization: {
      sectors: { it: 'IT & Services', finance: 'Finanzen', health: 'Gesundheit' }
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
      },
      loading: 'Loading…'
    },
    norrly: {
      name: 'Norrly',
      header: { subtitle: 'Norrly – your teammate for NIS2 & the AI Act.' },
      intro: { headline: 'Hi, I\'m Norrly', text: 'I explain, advise and guide you from rule to rollout.' },
      input: { open: 'Open', cancel: 'Cancel', loading: 'Loading…' },
      voice: { on: 'Voice on', off: 'Voice off' },
      session: { reset: 'Reset session' },
      loading: 'Loading…',
      welcome: 'Welcome'
    },
    labels: { nis2: 'NIS2', ai_act: 'AI Act', gdpr: 'GDPR' },
    sections: { controls: 'Controls', evidence: 'Evidence', trainings: 'Trainings', dpia: 'DPIA' },
    training: { missing_data: 'No training data available.' },
    dashboard: {
      name: 'Dashboard',
      loading: 'Loading…',
      welcome: 'Welcome',
      labels: { ai_act: 'EU AI Act', gdpr: 'GDPR', nis2: 'NIS2' },
      sections: { controls: 'Controls', evidence: 'Evidence', trainings: 'Trainings', dpia: 'DPIA' },
      training: { missing_data: 'No data' },
      uploadEvidence: 'Upload evidence',
      uploadEvidenceDesc: 'Upload documents or screenshots as evidence.',
      scheduleChecks: 'Schedule checks',
      scheduleChecksDesc: 'Set intervals for automated checks.',
      addRisks: 'Add risks',
      addRisksDesc: 'Create risks and link mitigations.',
      generatePolicy: 'Generate policy',
      generatePolicyDesc: 'Create policies from your data.',
      nextStepsHeader: 'Next steps',
      nextStepsSub: 'Start here to move faster.',
      trialStatus: 'Trial status',
      active: 'Active',
      trialStatusDesc: 'Your trial is running.',
      daysRemaining: '{{count}} days remaining',
      upgradePlan: 'Upgrade plan',
      trialNote: 'You can upgrade any time.',
      organization: 'Organization',
      organizationDesc: 'Your organization master data.',
      companyName: 'Company name',
      country: 'Country',
      sector: 'Sector',
      sectors: { it: 'IT', finance: 'Finance', health: 'Health' },
      viewOrganization: 'View organization',
      recentAuditReports: 'Recent audit reports',
      recentAuditReportsDesc: 'Latest findings and reports.',
      viewAll: 'View all',
      noReportsYet: 'No reports yet.',
      complianceProgress: 'Compliance progress',
      complianceOverall: 'Overall',
      complianceOverallDesc: 'Overall score including sections.',
      complianceOverallTooltipWithTraining: 'Overall score incl. training coverage.',
      complianceStatusNeeds: 'Needs action',
      createAuditTask: 'Create audit task'
    },
    organization: {
      sectors: { it: 'IT & Services', finance: 'Finance', health: 'Health' }
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
      },
      loading: 'Laddar…'
    },
    norrly: {
      name: 'Norrly',
      header: { subtitle: 'Norrly – din kollega för NIS2 & AI-lagen.' },
      intro: { headline: 'Hej, jag är Norrly', text: 'Jag förklarar, rådgiver och guidar dig till införande.' },
      input: { open: 'Öppna', cancel: 'Avbryt', loading: 'Laddar…' },
      voice: { on: 'Röst på', off: 'Röst av' },
      session: { reset: 'Återställ session' },
      loading: 'Laddar…',
      welcome: 'Välkommen'
    },
    labels: { nis2: 'NIS2', ai_act: 'AI Act', gdpr: 'GDPR' },
    sections: { controls: 'Kontroller', evidence: 'Bevis', trainings: 'Utbildningar', dpia: 'DPIA' },
    training: { missing_data: 'Ingen träningsdata tillgänglig.' },
    dashboard: {
      name: 'Instrumentpanel',
      loading: 'Laddar…',
      welcome: 'Välkommen',
      labels: { ai_act: 'EU AI Act', gdpr: 'GDPR', nis2: 'NIS2' },
      sections: { controls: 'Kontroller', evidence: 'Bevis', trainings: 'Utbildningar', dpia: 'DPIA' },
      training: { missing_data: 'Ingen data' },
      uploadEvidence: 'Ladda upp bevis',
      uploadEvidenceDesc: 'Ladda upp dokument eller skärmdumpar.',
      scheduleChecks: 'Schemalägg kontroller',
      scheduleChecksDesc: 'Ställ in intervall för automatiska kontroller.',
      addRisks: 'Lägg till risker',
      addRisksDesc: 'Skapa risker och koppla åtgärder.',
      generatePolicy: 'Skapa policy',
      generatePolicyDesc: 'Skapa policyer baserat på dina data.',
      nextStepsHeader: 'Nästa steg',
      nextStepsSub: 'Börja här för att komma igång snabbare.',
      trialStatus: 'Teststatus',
      active: 'Aktiv',
      trialStatusDesc: 'Din testperiod pågår.',
      daysRemaining: '{{count}} dagar kvar',
      upgradePlan: 'Uppgradera plan',
      trialNote: 'Du kan uppgradera när som helst.',
      organization: 'Organisation',
      organizationDesc: 'Din organisations grunddata.',
      companyName: 'Företagsnamn',
      country: 'Land',
      sector: 'Sektor',
      sectors: { it: 'IT', finance: 'Finans', health: 'Hälsa' },
      viewOrganization: 'Visa organisation',
      recentAuditReports: 'Senaste revisionsrapporter',
      recentAuditReportsDesc: 'Senaste resultat och rapporter.',
      viewAll: 'Visa alla',
      noReportsYet: 'Inga rapporter ännu.',
      complianceProgress: 'Efterlevnadsstatus',
      complianceOverall: 'Totalt',
      complianceOverallDesc: 'Totalsiffra inklusive delområden.',
      complianceOverallTooltipWithTraining: 'Totalsiffra inklusive utbildningstäckning.',
      complianceStatusNeeds: 'Åtgärd krävs',
      createAuditTask: 'Skapa revisionsuppgift'
    },
    organization: {
      sectors: { it: 'IT & tjänster', finance: 'Finans', health: 'Hälsa' }
    }
  }
} : undefined;

// Detect initial language
const initialLng = detectBrowserLocale(['de', 'en', 'sv'], 'de');

// Singleton guard to prevent double initialization
if (!i18n.isInitialized) {
  i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
    lng: initialLng,
    fallbackLng: 'de',
    debug: import.meta.env.DEV,
    ns: ['common', 'dashboard', 'documents', 'billing', 'nis2', 'checks', 'controls', 'admin', 'helpbot', 'norrly', 'training', 'assistant', 'aiSystems', 'aiAct', 'evidence', 'scope', 'nav', 'reports', 'ops', 'organization', 'audit', 'incidents'],
    defaultNS: 'common',
    preload: ['de', 'en', 'sv'],
    load: 'currentOnly',
    backend: {
      loadPath: loadPathFn,
      queryStringParams: {
        v: import.meta.env.DEV ? String(Date.now()) : '2025-11-08a'
      },
      allowMultiLoading: false,
      crossDomain: false,
      requestOptions: { cache: 'no-store' },
      parse: (data: string, languages?: string | string[], namespaces?: string | string[]) => {
        const trimmed = data.trim();

        // 1) HTML/error pages defense
        if (/^<!doctype html>/i.test(trimmed) || /^<html/i.test(trimmed)) {
          const langInfo = typeof languages === 'string' ? languages : languages?.[0];
          const nsInfo = typeof namespaces === 'string' ? namespaces : namespaces?.[0];
          throw new Error(`[i18n] Received HTML instead of JSON for ${langInfo}/${nsInfo} (check loadPath / dev server)`);
        }

        // 2) Parse JSON
        let parsed: any;
        try {
          parsed = JSON.parse(trimmed);
        } catch (e) {
          const langInfo = typeof languages === 'string' ? languages : languages?.[0];
          const nsInfo = typeof namespaces === 'string' ? namespaces : namespaces?.[0];
          throw new Error(`[i18n] Invalid JSON in ${langInfo}/${nsInfo}: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 3) Auto-convert flat→nested only if needed
        const hasFlat = Object.keys(parsed).some(k => k.includes('.'));
        if (import.meta.env.DEV) {
          const langInfo = typeof languages === 'string' ? languages : languages?.[0];
          const nsInfo = typeof namespaces === 'string' ? namespaces : namespaces?.[0];
          try {
            console.debug('[i18n.parse]', `${langInfo}/${nsInfo}`, 'flat=', hasFlat, 'keys=', Object.keys(parsed).slice(0, 5));
          } catch {}
        }
        if (hasFlat) {
          if (import.meta.env.DEV) {
            const langInfo = typeof languages === 'string' ? languages : languages?.[0];
            const nsInfo = typeof namespaces === 'string' ? namespaces : namespaces?.[0];
            console.warn(`[i18n] Converting flat keys to nested for ${langInfo}/${nsInfo}`);
          }
          return toNested(parsed);
        }

        return parsed;
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
    // keySeparator default (.) for nested keys like "header.subtitle"
    nsSeparator: ':',
    returnObjects: true,
    parseMissingKeyHandler: (key) => {
      if (import.meta.env.DEV) {
        console.warn('[i18n missing]', key);
      }
      return key;
    },
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) {
        const lng = Array.isArray(lngs) ? lngs[0] : (lngs || 'unknown');
        emitMissingKey({ lng, ns, key });
      }
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

// A2: DEV diagnostic - Runtime status of i18n resource bundles
if (DEV) {
  const langs = ['de', 'en', 'sv'];
  const nss = ['common', 'dashboard', 'organization', 'norrly', 'training', 'labels', 'sections'];
  console.group('[i18n bundles]');
  console.log('isInitialized', i18n.isInitialized, 'language', i18n.language, 'ns', i18n.options.ns);
  for (const l of langs) {
    for (const ns of nss) {
      const hasBundle = i18n.hasResourceBundle(l, ns);
      const keys = Object.keys(i18n.getResourceBundle(l, ns) || {}).slice(0, 5);
      console.log(l, ns, hasBundle, keys);
    }
  }
  console.groupEnd();
}

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
