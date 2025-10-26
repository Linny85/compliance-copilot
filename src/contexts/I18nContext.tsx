import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/i18n/init';

type CtxType = {
  i18n: typeof i18n;
  lng: string;
  language: string;
  ready: boolean;
  setLanguage: (lng: string) => void;
};

const Ctx = createContext<CtxType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for i18n to be initialized
    if (i18n.isInitialized) {
      setIsReady(true);
    } else {
      i18n.on('initialized', () => setIsReady(true));
    }
  }, []);

  if (!isReady) {
    return null; // or a loading spinner
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Ctx.Provider value={{
        i18n,
        lng: i18n.language,
        language: i18n.language,
        ready: true,
        setLanguage: (lng) => { 
          localStorage.setItem('i18nextLng', lng); 
          i18n.changeLanguage(lng); 
        },
      }}>
        {children}
      </Ctx.Provider>
    </I18nextProvider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  const { t } = useTranslation();
  
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  
  return {
    ...ctx,
    t, // Add useTranslation's t function
  };
}
