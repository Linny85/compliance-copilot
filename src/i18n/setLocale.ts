import i18n from './init';
import { normalizeLocale, supportedLocales, type Locale } from './languages';

let switching = false;
let lastSwitch = 0;

export async function setLocale(raw: string) {
  const lng = normalizeLocale(raw) as Locale;
  if (!supportedLocales.includes(lng)) {
    console.warn('[setLocale] normalized but not supported:', lng);
    return;
  }

  const current = (i18n.resolvedLanguage || i18n.language) as Locale;
  if (current === lng || switching || Date.now() - lastSwitch < 400) return;

  switching = true;
  try {
    await i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
    lastSwitch = Date.now();
  } finally {
    switching = false;
  }
}
