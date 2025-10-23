import { getI18n } from 'react-i18next';

/**
 * Safe translation helper for edge cases where t() might be called
 * outside of i18n context (hot-reload, preview, etc.)
 * Falls back to returning the key if translation fails
 */
export function safeT(key: string, options?: any): string {
  try {
    const i18nInstance = getI18n();
    if (i18nInstance?.t) {
      const result = i18nInstance.t(key, options);
      return typeof result === 'string' ? result : key;
    }
    return key;
  } catch (error) {
    console.warn(`[safeT] Translation failed for key: ${key}`, error);
    return key;
  }
}
