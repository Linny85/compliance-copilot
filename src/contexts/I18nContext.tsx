import React, { createContext, useContext, useMemo } from 'react';
import { translations } from '@/lib/i18n';

type Lang = 'de' | 'en' | 'sv';

type I18nCtx = {
  t: typeof translations.en;   // Objekt-Notation bleibt intakt
  lng: Lang;
  language: Lang;              // Alias für Abwärtskompat.
  ready: boolean;
  setLanguage: (lng: Lang) => void; // NO-OP
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const tObj = useMemo(() => translations.de as typeof translations.en, []);
  const value: I18nCtx = useMemo(() => ({
    t: tObj,
    lng: 'de',
    language: 'de',
    ready: true,
    setLanguage: () => {}, // bewusst deaktiviert
  }), [tObj]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
