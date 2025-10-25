import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { setLocale } from '@/i18n/setLocale';
import type { Locale } from '@/i18n/languages';

/**
 * One-time locale hydrator component
 * Runs ONCE at app startup to load user's language preference
 * Placed at top-level to avoid StrictMode double-mount issues
 */
export function LocaleHydrator() {
  const { i18n } = useTranslation();
  const didHydrate = useRef(false);

  useEffect(() => {
    // Absolute guard: only run once per app lifecycle
    if (didHydrate.current) return;
    didHydrate.current = true;

    let cancelled = false;

    const hydrateLocale = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profile?.language && profile.language !== i18n.language) {
          await setLocale(profile.language as Locale);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[LocaleHydrator] hydration failed:', error);
        }
      }
    };

    hydrateLocale();

    return () => {
      cancelled = true;
    };
  }, [i18n]);

  return null; // This component doesn't render anything
}
