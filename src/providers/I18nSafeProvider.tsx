import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/init';
import { LanguageGate } from '@/components/LanguageGate';
import { LocaleHydrator } from '@/components/LocaleHydrator';

/**
 * Stable wrapper for I18nextProvider:
 * - waits until i18n is initialized
 * - subscribes to "initialized" event (critical!)
 * - wraps children in LanguageGate to prevent flickering
 */
export default function I18nSafeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState<boolean>(i18n?.isInitialized ?? false);

  useEffect(() => {
    if (!i18n) return;
    if (i18n.isInitialized) {
      setReady(true);
      return;
    }
    const onInit = () => {
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
    // Don't render until i18n is ready
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageGate>
        <LocaleHydrator />
        {children}
      </LanguageGate>
    </I18nextProvider>
  );
}
