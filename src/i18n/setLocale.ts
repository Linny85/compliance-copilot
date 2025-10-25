import i18n from './init';
import { supportedLocales, type Locale } from './languages';

let switching = false;
let lastSwitch = 0;
const THROTTLE_MS = 400; // Prevent rapid successive switches

/**
 * Safely change i18n language with guards against loops
 * - Prevents switching to the same language
 * - Prevents concurrent switches
 * - Throttles rapid successive calls
 * - Persists to localStorage
 */
export async function setLocale(lng: Locale) {
  const now = Date.now();
  const current = (i18n.resolvedLanguage || i18n.language) as Locale;

  // Guard 1: Already on this language
  if (current === lng) {
    return;
  }

  // Guard 2: Invalid language
  if (!supportedLocales.includes(lng)) {
    console.warn(`[setLocale] Invalid language: ${lng}`);
    return;
  }

  // Guard 3: Switch in progress
  if (switching) {
    return;
  }

  // Guard 4: Too rapid (throttle)
  if (now - lastSwitch < THROTTLE_MS) {
    return;
  }

  switching = true;
  try {
    await i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
    lastSwitch = now;
  } catch (error) {
    console.error('[setLocale] Failed to change language:', error);
  } finally {
    switching = false;
  }
}
