import i18n from './init';
import { normalizeLocale, supportedLocales, type Locale } from './languages';

let switching = false;
let lastSwitch = 0;
let pending: Promise<void> | null = null;

export async function setLocale(raw: string) {
  const lng = normalizeLocale(raw) as Locale;
  if (!supportedLocales.includes(lng)) return;

  const current = (i18n.resolvedLanguage || i18n.language) as Locale;
  if (current === lng) return;

  // Coalesce: if switch in progress, wait for same promise
  if (pending) return pending;

  // Throttle
  if (Date.now() - lastSwitch < 400) return;

  switching = true;
  pending = (async () => {
    try {
      await i18n.changeLanguage(lng);
      localStorage.setItem('i18nextLng', lng);
      lastSwitch = Date.now();
    } finally {
      switching = false;
      pending = null;
    }
  })();

  return pending;
}
