import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setLocale } from '@/i18n/setLocale';
import i18n from '@/i18n/init';
import type { Locale } from '@/i18n/languages';

const LOCK_KEY = '__ni_locale_hydrated_v1';
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 min

function hasValidLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && (Date.now() - ts) < LOCK_TTL_MS;
  } catch { return false; }
}

function setLock() {
  try { localStorage.setItem(LOCK_KEY, String(Date.now())); } catch {}
}

/**
 * One-time locale hydrator component
 * Uses cross-frame lock to prevent multiple hydrations in Lovable editor
 */
export function LocaleHydrator() {
  const didHydrate = useRef(false);

  useEffect(() => {
    // Cross-frame guard via localStorage
    if (hasValidLock()) return;
    
    // Component-instance guard
    if (didHydrate.current) return;
    didHydrate.current = true;

    // Broadcast to other frames/tabs
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('ni_i18n') : null;
    bc?.postMessage({ type: 'hydration:start' });

    let cancelled = false;
    
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .maybeSingle();

        if (!cancelled) {
          const lng = profile?.language as Locale | undefined;
          if (lng && lng !== i18n.language) {
            await setLocale(lng);
          }
          setLock();
          bc?.postMessage({ type: 'hydration:done', lng: i18n.language });
        }
      } catch (e) {
        setLock();
        bc?.postMessage({ type: 'hydration:error' });
      }
    })();

    bc?.addEventListener?.('message', (ev: any) => {
      if (ev?.data?.type?.startsWith('hydration:')) {
        // Another frame/tab handled hydration
      }
    });

    return () => {
      cancelled = true;
      bc?.close?.();
    };
  }, []);

  return null;
}
