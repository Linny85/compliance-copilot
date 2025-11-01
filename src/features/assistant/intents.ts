// Erweiterte Intent-Erkennung für Navigation (DE/EN/SV)
export type ChatAction =
  | { type: 'NAVIGATE'; path: string; highlight?: string; label: string; confidence: number };

type NavPattern = {
  regex: RegExp;
  path: string;
  label: { de: string; en: string; sv: string };
  confidence: number;
  highlight?: string;
};

const NAV_PATTERNS: NavPattern[] = [
  // Training
  { regex: /training|kurs|schulung/i, path: '/training', label: { de: 'Training', en: 'Training', sv: 'Utbildning' }, confidence: 0.9 },
  
  // Incidents
  { regex: /vorfall.*meld|incident.*report|incident.*new|breach.*report/i, path: '/incidents/new', label: { de: 'Vorfall melden', en: 'Report Incident', sv: 'Rapportera incident' }, confidence: 0.95 },
  { regex: /vorfäll|incidents|meldungen|security events/i, path: '/incidents', label: { de: 'Vorfälle', en: 'Incidents', sv: 'Incidenter' }, confidence: 0.85 },
  
  // Audits
  { regex: /audit|prüfung|revision/i, path: '/audits', label: { de: 'Audit', en: 'Audit', sv: 'Revision' }, confidence: 0.9 },
  
  // Registry
  { regex: /register|registrierung/i, path: '/registry', label: { de: 'NIS2-Register', en: 'NIS2 Registry', sv: 'NIS2-register' }, confidence: 0.85 },
  
  // Governance & Roles
  { regex: /rollen|verantwortlichkeiten|raci|responsibilities/i, path: '/governance/roles', label: { de: 'Rollen', en: 'Roles', sv: 'Roller' }, confidence: 0.9 },
  
  // Documents/Policies
  { regex: /richtlinie|policy|policies|dokument/i, path: '/documents', label: { de: 'Richtlinien', en: 'Policies', sv: 'Policyer' }, confidence: 0.85 },
  
  // Dashboard
  { regex: /dashboard|start|übersicht|home|overview/i, path: '/dashboard', label: { de: 'Dashboard', en: 'Dashboard', sv: 'Instrumentpanel' }, confidence: 0.8 },
  
  // Billing
  { regex: /billing|abrechnung|abo|rechnung|subscription|payment/i, path: '/billing', label: { de: 'Billing', en: 'Billing', sv: 'Fakturering' }, confidence: 0.9 },
  
  // Settings
  { regex: /einstellungen|settings|profil|profile/i, path: '/settings', label: { de: 'Einstellungen', en: 'Settings', sv: 'Inställningar' }, confidence: 0.8 },
  
  // Help
  { regex: /hilfe|faq|support|help/i, path: '/help', label: { de: 'Hilfe', en: 'Help', sv: 'Hjälp' }, confidence: 0.8 },
  
  // Controls/Measures
  { regex: /maßnahme.*neu|control.*(neu|anlegen|new|create)/i, path: '/controls', label: { de: 'Maßnahmen', en: 'Controls', sv: 'Kontroller' }, confidence: 0.9 },
  { regex: /maßnahme(n)?|control(s)?|measure(s)?|åtgärd(er)?/i, path: '/controls', label: { de: 'Maßnahmen', en: 'Controls', sv: 'Kontroller' }, confidence: 0.85 },
  
  // Company Profile
  { regex: /(unternehmens|firmen)daten|adresse|firma.*eintrag|impressum|company.*(details|data)|företags.*uppgifter/i, path: '/company-profile', label: { de: 'Firmendaten', en: 'Company Profile', sv: 'Företagsuppgifter' }, confidence: 0.9, highlight: '#company-form' },
  
  // Admin/Users
  { regex: /benutzer|nutzer|einlad|user(s)?|invite|bjud.*in|användare/i, path: '/admin', label: { de: 'Admin', en: 'Admin', sv: 'Admin' }, confidence: 0.85, highlight: '#invite-user' },
];

export function detectIntents(message: string, lang: 'de'|'en'|'sv'): ChatAction[] {
  const m = message.toLowerCase();
  
  for (const pattern of NAV_PATTERNS) {
    if (pattern.regex.test(m)) {
      return [{
        type: 'NAVIGATE',
        path: pattern.path,
        label: pattern.label[lang],
        confidence: pattern.confidence,
        highlight: pattern.highlight
      }];
    }
  }
  
  return [];
}
