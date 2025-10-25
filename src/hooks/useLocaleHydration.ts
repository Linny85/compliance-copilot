import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { setLocale } from '@/i18n/setLocale';
import type { Locale } from '@/i18n/languages';

/**
 * Hydrates user's language preference from database on mount
 * Priority: User profile → localStorage → fallback
 * 
 * CRITICAL: Uses ref guard to ensure this only runs ONCE to prevent
 * flickering from repeated calls (e.g., in StrictMode or on auth state changes)
 */
export function useLocaleHydration() {
  const { i18n } = useTranslation();
  const didRun = useRef(false);

  useEffect(() => {
    // Guard: Only run once per component lifecycle
    if (didRun.current) return;
    didRun.current = true;

    const hydrateLocale = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.language && profile.language !== i18n.language) {
          await setLocale(profile.language as Locale);
        }
      } catch (error) {
        console.warn('locale hydration failed:', error);
      }
    };

    hydrateLocale();
  }, [i18n]);
}
