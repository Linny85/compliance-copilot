import { createContext, useContext, ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleHydration } from "@/hooks/useLocaleHydration";
import { translations } from "@/lib/i18n";

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: typeof translations.en;
  ready: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();
  
  // Hydrate user's language preference from DB
  useLocaleHydration();

  const setLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
  };

  // Provide legacy object-style t powered by i18next for ALL languages
  const buildTObject = (template: any, prefix = ''): any => {
    const out: any = Array.isArray(template) ? [] : {};
    for (const key in template) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (template[key] && typeof template[key] === 'object') {
        out[key] = buildTObject(template[key], path);
      } else {
        out[key] = i18n.t(path);
      }
    }
    return out;
  };

  const tObj = useMemo(() => buildTObject(translations.en), [i18n.language]);

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
