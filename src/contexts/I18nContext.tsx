import { createContext, useContext, ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { translations } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { setLocale } from "@/i18n/setLocale";

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: typeof translations.en;
  ready: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();

  const setLanguage = async (lang: string) => {
    await setLocale(lang);
  };

  // Provide object-style t sourced from our local translations
  // Avoid calling i18n.t here to prevent resource fetch/keys flicker
  const tObj = useMemo(() => {
    const lng = (i18n.language as Language) || "en";
    return (translations[lng] ?? translations.en);
  }, [i18n.language]);

  const value: I18nContextType = {
    language: i18n.language,
    setLanguage,
    t: tObj as typeof translations.en,
    ready: i18n.isInitialized,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};
