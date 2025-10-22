import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translations, Language } from "@/lib/i18n";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const getDefaultLanguage = (): Language => {
  // Check localStorage first
  const stored = localStorage.getItem('lang');
  if (stored === 'en' || stored === 'de' || stored === 'sv') {
    return stored;
  }

  // Detect from browser
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('de')) return 'de';
  if (browserLang.startsWith('sv')) return 'sv';
  return 'en';
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(getDefaultLanguage());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Load language from user profile if authenticated
    const loadUserLanguage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.language) {
            setLanguageState(profile.language as Language);
          }
        }
      } catch (error) {
        console.error('Error loading user language:', error);
      } finally {
        setInitialized(true);
      }
    };

    loadUserLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lang', lang);

    // Update user profile if authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ language: lang })
          .eq('id', session.user.id);
      }
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
  };

  // Don't render until initialized to avoid flash of wrong language
  if (!initialized) {
    return null;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};
