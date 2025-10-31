import { TFunction } from 'i18next';

/**
 * Safe translation helper - prevents crashes from missing keys
 * Falls back to key itself if translation fails
 * 
 * Usage:
 * ```tsx
 * import { tSafe } from '@/utils/i18nSafe';
 * 
 * const MyComponent = () => {
 *   const { t } = useTranslation();
 *   
 *   return <div>{tSafe(t, 'some.potentially.missing.key')}</div>;
 * };
 * ```
 */
export function tSafe(
  t: TFunction | ((key: string, options?: any) => string),
  key: string,
  options?: any
): string {
  try {
    const result = t(key, options);
    
    // If translation returns the key itself, it likely wasn't found
    // But still return it as it's the best fallback we have
    return result;
  } catch (error) {
    // Log error in development but don't crash
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Translation failed for key: ${key}`, error);
    }
    
    // Return the key as fallback - makes missing translations visible
    return key;
  }
}

/**
 * Check if a translation key exists
 * Useful for conditional rendering based on translation availability
 */
export function hasTranslation(
  t: TFunction | ((key: string) => string),
  key: string
): boolean {
  try {
    const result = t(key);
    // If the result equals the key, the translation likely doesn't exist
    return result !== key;
  } catch {
    return false;
  }
}

/**
 * Get translation with fallback to default value
 */
export function tWithDefault(
  t: TFunction | ((key: string, options?: any) => string),
  key: string,
  defaultValue: string,
  options?: any
): string {
  try {
    const result = t(key, options);
    // If result equals key, use default
    return result === key ? defaultValue : result;
  } catch {
    return defaultValue;
  }
}
