import React, { createContext, useContext, useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/init";
import { translations } from "@/lib/i18n";

type Lang = 'de' | 'en' | 'sv';

type I18nCtx = {
  t: typeof translations.en; // Objekt-Notation bleibt
  i18n: typeof import("i18next").default;
  lng: Lang; // bleibt 'de'
  language: Lang; // Alias
  ready: boolean; // immer true
  setLanguage: (lng: Lang) => void; // vorübergehend NO-OP
};

// Freeze-Hardmode: alles bleibt DE, egal was außen passiert
const FROZEN_LANG: Lang = 'de';

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Sprache ZWINGEND auf DE halten (ohne Events/Listener)
  if ((i18n as any).language !== FROZEN_LANG) {
    (i18n as any).language = FROZEN_LANG;
  }
  // Externe changeLanguage-Versuche neutralisieren (keine Events, kein Remount)
  (i18n as any).changeLanguage = async () => (i18n as any).language;

  // Keine Listener, kein setState, kein useEffect → nichts kann remounten
  const tObj = useMemo(() => (
    (translations[FROZEN_LANG] ?? translations.de) as typeof translations.en
  ), []);

  const value: I18nCtx = useMemo(() => ({
    t: tObj,
    i18n,
    lng: FROZEN_LANG,
    language: FROZEN_LANG,
    ready: true,
    setLanguage: () => { /* frozen: no-op */ },
  }), [tObj]);

  return (
    <I18nextProvider i18n={i18n}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </I18nextProvider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
