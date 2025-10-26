import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/init';
import { translations } from '@/lib/i18n';

type Lang = 'de' | 'en' | 'sv';
type CtxType = {
  t: typeof translations.en;
  i18n: typeof i18n;
  lng: Lang;
  language: Lang;
  ready: boolean;
  setLanguage: (lng: Lang) => void;
};

const Ctx = createContext<CtxType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [currentLng, setCurrentLng] = useState<Lang>(() => {
    const stored = localStorage.getItem('i18nextLng') as Lang;
    return stored && ['de', 'en', 'sv'].includes(stored) ? stored : 'de';
  });

  // Listen to i18n language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (['de', 'en', 'sv'].includes(lng)) {
        setCurrentLng(lng as Lang);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const tObj = useMemo(() => {
    const langTranslations = (translations as any)[currentLng];
    return langTranslations || translations.en;
  }, [currentLng]);
  
  const value: CtxType = useMemo(() => ({
    t: tObj,
    i18n,
    lng: currentLng,
    language: currentLng,
    ready: true,
    setLanguage: (lng) => { 
      localStorage.setItem('i18nextLng', lng); 
      i18n.changeLanguage(lng); 
    },
  }), [tObj, currentLng]);

  return (
    <I18nextProvider i18n={i18n}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </I18nextProvider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
