import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hydrates user's language preference from database on mount
 * Priority: User profile → Browser detection (auto) → fallback 'en'
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
          await i18n.changeLanguage(profile.language);
        }
      } catch (error) {
        console.error('Error hydrating locale:', error);
      }
    };

    hydrateLocale();
  }, [i18n]);
}
