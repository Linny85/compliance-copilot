// Leichte Heuristik (DE/EN/SV) → liefert 0..1 NAVIGATE-Aktion zurück
export type ChatAction =
  | { type: 'NAVIGATE'; path: string; highlight?: string };

export function detectIntents(message: string, lang: 'de'|'en'|'sv'): ChatAction[] {
  const m = message.toLowerCase();

  // --- Deutsch ---
  if (lang === 'de') {
    if (/(unternehmens|firmen)daten|adresse|firma eintragen|impressum/.test(m))
      return [{ type: 'NAVIGATE', path: '/company-profile', highlight: '#company-form' }];
    if (/rechnung|abrechnung|abo|zahlungsdaten|stripe/.test(m))
      return [{ type: 'NAVIGATE', path: '/billing' }];
    if (/benutzer|nutzer|rollen|mitarbeit(er|erin)|einladen/.test(m))
      return [{ type: 'NAVIGATE', path: '/admin', highlight: '#invite-user' }];
    if (/maßnahme.*neu|control.*(neu|anlegen)/.test(m))
      return [{ type: 'NAVIGATE', path: '/controls' }];
    if (/maßnahme(n)?|control(s)?/.test(m))
      return [{ type: 'NAVIGATE', path: '/controls' }];
    if (/richtlinie|policy|dokument/.test(m))
      return [{ type: 'NAVIGATE', path: '/documents' }];
  }

  // --- English ---
  if (lang === 'en') {
    if (/company (details|data)|address|imprint/.test(m))
      return [{ type: 'NAVIGATE', path: '/company-profile', highlight: '#company-form' }];
    if (/billing|invoice|subscription|payment/.test(m))
      return [{ type: 'NAVIGATE', path: '/billing' }];
    if (/user(s)?|roles|invite/.test(m))
      return [{ type: 'NAVIGATE', path: '/admin', highlight: '#invite-user' }];
    if (/measure|control.*(new|create)/.test(m))
      return [{ type: 'NAVIGATE', path: '/controls' }];
    if (/measure(s)?|control(s)?/.test(m))
      return [{ type: 'NAVIGATE', path: '/controls' }];
    if (/policy|policies|document/.test(m))
      return [{ type: 'NAVIGATE', path: '/documents' }];
  }

  // --- Svenska ---
  if (lang === 'sv') {
    if (/(företags)?uppgifter|adress|impressum/.test(m))
      return [{ type: 'NAVIGATE', path: '/company-profile', highlight: '#company-form' }];
    if (/faktur(a|ering)|abonnemang|betalning/.test(m))
      return [{ type: 'NAVIGATE', path: '/billing' }];
    if (/användare|roller|bjud in/.test(m))
      return [{ type: 'NAVIGATE', path: '/admin', highlight: '#invite-user' }];
    if (/åtgärd.*ny|kontroll.*(ny|skapa)/.test(m))
      return [{ type: 'NAVIGATE', path: '/controls' }];
    if (/åtgärd(er)?|kontroll(er)?/.test(m))
      return [{ type: 'NAVIGATE', path: '/controls' }];
    if (/policy|policies|dokument/.test(m))
      return [{ type: 'NAVIGATE', path: '/documents' }];
  }

  return [];
}
