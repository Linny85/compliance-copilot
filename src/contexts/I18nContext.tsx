import React, { createContext, useContext, useMemo } from 'react';
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
  const tObj = useMemo(() => translations.de as typeof translations.en, []);
  const value: CtxType = useMemo(() => ({
    t: tObj,
    i18n,
    lng: 'de',
    language: 'de',
    ready: true,
    setLanguage: (lng) => { 
      localStorage.setItem('i18nextLng', lng); 
      i18n.changeLanguage(lng); 
    },
  }), [tObj]);

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
