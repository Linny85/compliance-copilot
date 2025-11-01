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
  { regex: /training|kurs|schulung|utbildning/i, path: '/admin/training-certificates', label: { de: 'Training', en: 'Training', sv: 'Utbildning' }, confidence: 0.9 },
  
  // Incidents (future - placeholder for now, redirects to checks)
  { regex: /vorfall.*meld|incident.*report|incident.*new|breach.*report/i, path: '/checks', label: { de: 'Vorfall melden', en: 'Report Incident', sv: 'Rapportera incident' }, confidence: 0.85 },
  
  // Audits
  { regex: /audit|prüfung|revision/i, path: '/audit', label: { de: 'Audit', en: 'Audit', sv: 'Revision' }, confidence: 0.9 },
  { regex: /audit.*neu|new.*audit|create.*audit/i, path: '/audit/new', label: { de: 'Neues Audit', en: 'New Audit', sv: 'Ny revision' }, confidence: 0.95 },
  
  // NIS2
  { regex: /nis2|nis\s*2|network.*security/i, path: '/nis2', label: { de: 'NIS2', en: 'NIS2', sv: 'NIS2' }, confidence: 0.9 },
  
  // AI Act
  { regex: /ai.*act|ki.*verordnung|ai.*förordning/i, path: '/ai-act', label: { de: 'AI Act', en: 'AI Act', sv: 'AI-förordningen' }, confidence: 0.9 },
  { regex: /ai.*system.*registr|ki.*system.*registr/i, path: '/ai-systems/register', label: { de: 'AI-System registrieren', en: 'Register AI System', sv: 'Registrera AI-system' }, confidence: 0.95 },
  
  // DPIA / Privacy
  { regex: /dpia|datenschutz.*folgen|privacy.*impact|konsekvensbedömning/i, path: '/privacy/dpia', label: { de: 'DPIA', en: 'DPIA', sv: 'DPIA' }, confidence: 0.9 },
  
  // Evidence
  { regex: /nachweis|evidence|bevis|proof/i, path: '/evidence', label: { de: 'Nachweise', en: 'Evidence', sv: 'Bevis' }, confidence: 0.85 },
  
  // Checks / Audits
  { regex: /checks|prüfungen|kontroller|verifikation/i, path: '/checks', label: { de: 'Prüfungen', en: 'Checks', sv: 'Kontroller' }, confidence: 0.85 },
  
  // Scope
  { regex: /scope|geltungsbereich|omfattning|anwendungsbereich/i, path: '/scope', label: { de: 'Geltungsbereich', en: 'Scope', sv: 'Omfattning' }, confidence: 0.85 },
  
  // Documents/Policies
  { regex: /richtlinie|policy|policies|dokument/i, path: '/documents', label: { de: 'Richtlinien', en: 'Documents', sv: 'Dokument' }, confidence: 0.85 },
  { regex: /dokument.*neu|new.*document|policy.*create/i, path: '/documents/new', label: { de: 'Neues Dokument', en: 'New Document', sv: 'Nytt dokument' }, confidence: 0.95 },
  
  // Dashboard
  { regex: /dashboard|start|übersicht|home|overview/i, path: '/dashboard', label: { de: 'Dashboard', en: 'Dashboard', sv: 'Instrumentpanel' }, confidence: 0.8 },
  
  // Billing
  { regex: /billing|abrechnung|abo|rechnung|subscription|payment|fakturering/i, path: '/billing', label: { de: 'Billing', en: 'Billing', sv: 'Fakturering' }, confidence: 0.9 },
  
  // Organization
  { regex: /organisation|organization|företag/i, path: '/organization', label: { de: 'Organisation', en: 'Organization', sv: 'Organisation' }, confidence: 0.85 },
  
  // Company Profile
  { regex: /(unternehmens|firmen)daten|adresse|firma.*eintrag|impressum|company.*(details|data|profile)|företags.*uppgifter/i, path: '/company-profile', label: { de: 'Firmendaten', en: 'Company Profile', sv: 'Företagsuppgifter' }, confidence: 0.9, highlight: '#company-form' },
  
  // Controls/Measures
  { regex: /maßnahme.*neu|control.*(neu|anlegen|new|create)|åtgärd.*ny/i, path: '/controls', label: { de: 'Neue Maßnahme', en: 'New Control', sv: 'Ny åtgärd' }, confidence: 0.95 },
  { regex: /maßnahme(n)?|control(s)?|measure(s)?|åtgärd(er)?/i, path: '/controls', label: { de: 'Maßnahmen', en: 'Controls', sv: 'Åtgärder' }, confidence: 0.85 },
  { regex: /control.*mapping|maßnahmen.*zuordnung|åtgärd.*mappning/i, path: '/controls/mapping', label: { de: 'Maßnahmen-Mapping', en: 'Control Mapping', sv: 'Åtgärdsmappning' }, confidence: 0.9 },
  
  // Admin
  { regex: /admin|administration|verwaltung/i, path: '/admin', label: { de: 'Admin', en: 'Admin', sv: 'Admin' }, confidence: 0.8 },
  { regex: /benutzer|nutzer|einlad|user(s)?|invite|bjud.*in|användare/i, path: '/admin', label: { de: 'Benutzerverwaltung', en: 'User Management', sv: 'Användarhantering' }, confidence: 0.85, highlight: '#invite-user' },
  { regex: /integrati(on|onen)|koppling(ar)?/i, path: '/admin/integrations', label: { de: 'Integrationen', en: 'Integrations', sv: 'Integrationer' }, confidence: 0.9 },
  { regex: /benachrichtigung|notification(s)?|aviseringar/i, path: '/settings/notifications', label: { de: 'Benachrichtigungen', en: 'Notifications', sv: 'Aviseringar' }, confidence: 0.9 },
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
