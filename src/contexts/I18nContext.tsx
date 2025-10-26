import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/init';
import { translations } from '@/lib/i18n';

type Lang = 'de' | 'en' | 'sv';

// Helper type for translation function
type TranslationFunction = (key: string, params?: string | Record<string, any>) => string;

type CtxType = {
  t: typeof translations.en & TranslationFunction;
  tx: (key: string, paramsOrFallback?: string | Record<string, any>) => string;
  i18n: typeof i18n;
  lng: Lang;
  language: Lang;
  ready: boolean;
  setLanguage: (lng: Lang) => void;
};

const Ctx = createContext<CtxType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Dev warning for double mounting
  useEffect(() => {
    if (import.meta.env.DEV) {
      // @ts-ignore
      if (window.__I18N_PROVIDER_MOUNTED) {
        console.warn('[i18n] I18nProvider ist doppelt gemountet – bitte nur einmal verwenden.');
      }
      // @ts-ignore
      window.__I18N_PROVIDER_MOUNTED = true;
    }
  }, []);

  const [currentLng, setCurrentLng] = useState<Lang>(() => {
    const stored = localStorage.getItem('i18nextLng') as Lang;
    return stored && ['de', 'en', 'sv'].includes(stored) ? stored : 'de';
  });

  // Update document lang and persist to localStorage
  useEffect(() => {
    try { 
      localStorage.setItem('i18nextLng', currentLng); 
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLng;
    }
  }, [currentLng]);

  // Listen to i18n language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log('[I18nContext] languageChanged event received:', lng);
      if (['de', 'en', 'sv'].includes(lng)) {
        console.log('[I18nContext] Setting currentLng to:', lng);
        setCurrentLng(lng as Lang);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  // Resolver function for flexible key access (supports 'controls:title' and 'controls.title')
  const resolveKey = (dict: any, key: string): any => {
    const path = key.replace(/:/g, '.').split('.');
    let current = dict;
    for (const part of path) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const tx = useMemo(() => {
    return (key: string, paramsOrFallback?: string | Record<string, any>): string => {
      const value = resolveKey((translations as any)[currentLng], key);
      let result: string | undefined;
      
      if (value !== undefined) {
        result = value as string;
      } else {
        const enValue = resolveKey(translations.en, key);
        if (enValue !== undefined) {
          result = enValue as string;
        }
      }
      
      if (result === undefined) {
        if (import.meta.env.DEV) {
          console.warn(`[i18n] Missing key in ${currentLng}:`, key);
        }
        return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
      }
      
      // Handle parameter interpolation
      if (typeof paramsOrFallback === 'object' && paramsOrFallback !== null) {
        Object.entries(paramsOrFallback).forEach(([paramKey, paramValue]) => {
          result = result!.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(paramValue));
        });
      }
      
      return result;
    };
  }, [currentLng]);

  const tObj = useMemo(() => {
    console.log('[I18nContext] Creating tObj for language:', currentLng);
    const langTranslations = (translations as any)[currentLng];
    const base = langTranslations || translations.en;
    
    // Add a function call interface for compatibility
    const tFunction = ((key: string, params?: string | Record<string, any>) => {
      const parts = key.split('.');
      let value: any = base;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) break;
      }
      
      // If value not found, use fallback (if params is string) or return key
      if (value === undefined) {
        if (import.meta.env.DEV) {
          console.warn(`[i18n] Missing key in ${currentLng}:`, key);
        }
        return typeof params === 'string' ? params : key;
      }
      
      // If params is an object, do simple string interpolation
      if (typeof params === 'object' && params !== null) {
        let result = value;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
        }
        return result;
      }
      
      return value;
    }) as any;
    
    // Copy all properties from base to function
    Object.assign(tFunction, base);
    
    // Add Proxy for missing key detection in dev mode
    if (import.meta.env.DEV) {
      return new Proxy(tFunction, {
        get(target, prop) {
          if (typeof prop === 'string' && !(prop in target)) {
            console.warn(`[i18n] Missing key in ${currentLng}:`, prop);
          }
          return target[prop as any];
        },
      });
    }
    
    return tFunction;
  }, [currentLng]);
  
  const value: CtxType = useMemo(() => ({
    t: tObj,
    tx,
    i18n,
    lng: currentLng,
    language: currentLng,
    ready: true,
    setLanguage: (lng) => { 
      localStorage.setItem('i18nextLng', lng); 
      i18n.changeLanguage(lng); 
    },
  }), [tObj, tx, currentLng]);

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
