import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { i18nReady } from "@/i18n/init";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

type I18nCtx = {
  t: typeof translations.en;
  i18n: typeof import("i18next").default;
  lng: string;
  language: string;
  ready: boolean;
  setLanguage: (lng: string) => void;
};

const Ctx = createContext<I18nCtx | null>(null);

function I18nProviderInner({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const [lng, setLng] = useState<string>(i18nInstance.language || "de");

  useEffect(() => {
    const onChanged = (next: string) => setLng(next);
    i18nInstance.on("languageChanged", onChanged);
    return () => {
      i18nInstance.off("languageChanged", onChanged);
    };
  }, [i18nInstance]);

  const setLanguage = (next: string) => {
    if (next && next !== i18nInstance.language) {
      localStorage.setItem("i18nextLng", next);
      i18nInstance.changeLanguage(next);
    }
  };

  const tObj = useMemo(() => {
    const lang = (lng as Language) || "de";
    return translations[lang] ?? translations.de;
  }, [lng]);

  const value: I18nCtx = useMemo(
    () => ({
      t: tObj as typeof translations.en,
      i18n: i18nInstance,
      lng,
      language: lng,
      ready: i18nInstance.isInitialized,
      setLanguage,
    }),
    [tObj, i18nInstance, lng]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(i18n.isInitialized);
  
  useEffect(() => {
    if (i18n.isInitialized) return;
    i18nReady.then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <I18nProviderInner>{children}</I18nProviderInner>
    </I18nextProvider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
