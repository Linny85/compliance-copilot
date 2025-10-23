import { createContext, useContext, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleHydration } from "@/hooks/useLocaleHydration";
import { translations } from "@/lib/i18n";

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: typeof translations.en;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  
  // Hydrate user's language preference from DB
  useLocaleHydration();

  const setLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
  };

  // Provide both i18next and legacy translation structure
  const currentLang = (i18n.language === 'de' || i18n.language === 'sv') ? i18n.language : 'en';
  
  const value: I18nContextType = {
    language: i18n.language,
    setLanguage,
    t: translations[currentLang as keyof typeof translations],
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
