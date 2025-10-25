import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { i18nReady } from "@/i18n/init";
import { translations } from "@/lib/i18n";

type Lang = 'de' | 'en' | 'sv';
type I18nCtx = {
  t: typeof translations.en;
  i18n: typeof import("i18next").default;
  lng: Lang;
  language: Lang; // Alias für lng (Kompatibilität)
  ready: boolean;
  setLanguage: (lng: Lang) => void;
};

// ⚠️ TEMP: Hard-Lock für Debug – auf 'de' sperren. (Später auf null setzen.)
const LOCKED_LANG: Lang | null = 'de';

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(i18n.isInitialized);
  const [lng, setLng] = useState<Lang>((i18n.language as Lang) || 'de');

  // interner Guard: nur wir dürfen die Sprache ändern
  const internalChange = useRef(false);
  const originalChangeLanguage = useRef(i18n.changeLanguage.bind(i18n));

  // Monkeypatch: blocke ALLE externen changeLanguage()-Aufrufe
  useEffect(() => {
    (i18n as any).changeLanguage = async (next: string) => {
      if (LOCKED_LANG) {
        // Hard-Lock aktiv → ignoriere jeden Wechsel
        console.warn('[i18n] Hard-lock active, ignoring changeLanguage:', next);
        return i18n.language;
      }
      if (!internalChange.current) {
        console.warn('[i18n] Blocked external changeLanguage:', next);
        return i18n.language;
      }
      return originalChangeLanguage.current(next);
    };
    return () => {
      // beim Unmount wiederherstellen (DEV/HMR)
      (i18n as any).changeLanguage = originalChangeLanguage.current;
    };
  }, []);

  useEffect(() => {
    if (!i18n.isInitialized) i18nReady.then(() => setReady(true));

    const onChanged = (next: string) => {
      // Wenn Hard-Lock aktiv ist → sofort zurücksetzen
      if (LOCKED_LANG && next !== LOCKED_LANG) {
        internalChange.current = true;
        originalChangeLanguage.current(LOCKED_LANG).finally(() => {
          internalChange.current = false;
        });
        return;
      }
      setLng((next as Lang) || 'de');
    };

    i18n.on('languageChanged', onChanged);
    return () => { i18n.off('languageChanged', onChanged); };
  }, []);

  // Manuelle Änderung (UI): nur hier erlauben
  const setLanguage = (next: Lang) => {
    if (LOCKED_LANG) {
      console.warn('[i18n] Hard-lock: manual setLanguage ignored. Unlock first.');
      return;
    }
    if (!next || next === i18n.language) return;
    localStorage.setItem('i18nextLng', next);
    internalChange.current = true;
    originalChangeLanguage.current(next).finally(() => {
      internalChange.current = false;
    });
  };

  // t-Objekt für die aktuelle Sprache
  const tObj = useMemo(() => {
    const lang = (LOCKED_LANG || lng) as Lang;
    return (translations[lang] ?? translations.de) as typeof translations.en;
  }, [lng]);

  const value = useMemo<I18nCtx>(() => ({
    t: tObj,
    i18n,
    lng: (LOCKED_LANG || lng) as Lang,
    language: (LOCKED_LANG || lng) as Lang, // Alias für lng
    ready,
    setLanguage,
  }), [tObj, lng, ready]);

  if (!ready) return null;

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
