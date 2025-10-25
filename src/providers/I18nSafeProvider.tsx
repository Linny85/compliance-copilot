import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/init';

/**
 * Safe wrapper for I18nextProvider that handles hot-reload and preview scenarios
 * where i18n instance might not be ready yet
 */
export default function I18nSafeProvider({ children }: { children: ReactNode }) {
  // Defensive: If i18n not ready (hot-reload/preview), render without provider
  if (!i18n) {
    console.warn('[I18nSafeProvider] i18n instance missing, rendering without provider (preview/hot-reload)');
    return <>{children}</>;
  }
  
  // Wait for i18n to be initialized to prevent flicker
  if (!i18n.isInitialized) {
    return null; // or a simple loader if preferred
  }
  
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
