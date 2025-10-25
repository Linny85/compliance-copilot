import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/init';

/**
 * Stable wrapper for I18nextProvider:
 * - waits until i18n is initialized
 * - subscribes to "initialized" event (critical!)
 * - always renders children within <I18nextProvider>
 */
export default function I18nSafeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState<boolean>(i18n?.isInitialized ?? false);

  useEffect(() => {
    if (!i18n) return;
    console.log('[Diag][I18nSafeProvider] mount: isInitialized =', i18n.isInitialized);
    if (i18n.isInitialized) {
      console.log('[Diag][I18nSafeProvider] i18n already initialized');
      setReady(true);
      return;
    }
    const onInit = () => {
      console.log('[Diag][I18nSafeProvider] initialized event fired');
      setReady(true);
    };
    i18n.on('initialized', onInit);
    return () => {
      i18n.off?.('initialized', onInit);
    };
  }, []);

  if (!i18n) {
    // Fallback: should never happen – only for preview/hot-reload edge cases
    console.warn('[I18nSafeProvider] i18n instance missing – rendering children without provider.');
    return <>{children}</>;
  }

  if (!ready) {
    // Optional: minimal loader
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
