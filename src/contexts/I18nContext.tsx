import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

type Lang = 'de' | 'en' | 'sv';

type TranslationFunction = {
  (key: string, params?: string | Record<string, any>): string;
  [key: string]: any;
};

type CtxType = {
  t: TranslationFunction;
  tx: (key: string, paramsOrFallback?: string | Record<string, any>) => string;
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

  useEffect(() => {
    try { 
      localStorage.setItem('i18nextLng', currentLng); 
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLng;
    }
  }, [currentLng]);

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

  const t: TranslationFunction = useMemo(() => {
    const translateFn = (key: string, params?: string | Record<string, any>): string => {
      const normalizedKey = key.replace(/:/g, '.');
      
      if (typeof params === 'object' && params !== null) {
        const result = i18n.t(normalizedKey, params);
        return String(result);
      }
      
      const result = i18n.t(normalizedKey);
      return String(result);
    };

    // Create Proxy to support both function calls and property access
    return new Proxy(translateFn as any, {
      get(target, prop: string) {
        if (prop === 'apply' || prop === 'call' || prop === 'bind') {
          return target[prop];
        }
        
        // Return a nested proxy for property chain access (e.g., t.nav.dashboard)
        return new Proxy((() => {}) as any, {
          get(_, nestedProp: string) {
            return new Proxy((() => {}) as any, {
              get(__, deepProp: string) {
                const result = i18n.t(`${prop}.${nestedProp}.${deepProp}`);
                return String(result);
              },
              apply() {
                const result = i18n.t(`${prop}.${nestedProp}`);
                return String(result);
              }
            });
          },
          apply() {
            const result = i18n.t(prop);
            return String(result);
          }
        });
      },
      apply(target, thisArg, args) {
        return target(...args);
      }
    });
  }, [currentLng]) as TranslationFunction;

  const tx = useMemo(() => {
    return (key: string, paramsOrFallback?: string | Record<string, any>): string => {
      const normalizedKey = key.replace(/:/g, '.');
      
      const result = i18n.t(normalizedKey, typeof paramsOrFallback === 'object' ? paramsOrFallback : undefined);
      const stringResult = String(result);
      
      if (stringResult === normalizedKey && typeof paramsOrFallback === 'string') {
        return paramsOrFallback;
      }
      
      return stringResult;
    };
  }, [currentLng]);
  
  const value: CtxType = useMemo(() => ({
    t,
    tx,
    i18n,
    lng: currentLng,
    language: currentLng,
    ready: i18n.isInitialized,
    setLanguage: (lng) => { 
      localStorage.setItem('i18nextLng', lng); 
      i18n.changeLanguage(lng); 
    },
  }), [t, tx, currentLng]);

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
