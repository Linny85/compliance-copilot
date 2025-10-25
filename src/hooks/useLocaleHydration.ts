import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { setLocale } from '@/i18n/setLocale';
import type { Locale } from '@/i18n/languages';

/**
 * Hydrates user's language preference from database on mount
 * Priority: User profile → localStorage → fallback
 */
export function useLocaleHydration() {
  const { i18n } = useTranslation();

  useEffect(() => {
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
        console.error('Error hydrating locale:', error);
      }
    };

    hydrateLocale();
  }, [i18n]);
}
