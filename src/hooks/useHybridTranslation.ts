import { useEffect, useState } from "react";
import i18next from "i18next";

type Cache = Record<string, string>;

export function useHybridTranslation(
  supabaseRestUrl: string,
  anonKey: string,
  locale: string,
  tenantId?: string | null
) {
  const [cache, setCache] = useState<Cache>({});
  const [loading, setLoading] = useState(false);

  async function prime(namespace: string) {
    setLoading(true);
    try {
      const base = supabaseRestUrl.replace(/\/$/, "") + "/rest/v1/translations";
      const qs = new URLSearchParams({
        select: "namespace,tkey,locale,text,approved",
        locale: `eq.${locale}`,
        namespace: `eq.${namespace}`,
        approved: "eq.true",
      });
      const route = tenantId 
        ? `${base}?${qs}&tenant_id=eq.${tenantId}` 
        : `${base}?${qs}&tenant_id=is.null`;
      
      const res = await fetch(route, {
        headers: { 
          apikey: anonKey, 
          Authorization: `Bearer ${anonKey}`, 
          Accept: "application/json" 
        },
      });
      
      if (!res.ok) {
        console.warn(`Failed to prime translations for ${namespace}:`, res.statusText);
        return;
      }
      
      const rows = await res.json();
      const next: Cache = { ...cache };
      for (const r of rows) {
        next[r.tkey] = r.text;
      }
      setCache(next);
    } catch (error) {
      console.error("Error priming translations:", error);
    } finally {
      setLoading(false);
    }
  }

  function t(path: string, defaultValue?: string): string {
    const key = path.includes(".") ? path : `ui.${path}`;
    // Priority: DB cache → i18next → defaultValue → key
    return cache[key] ?? i18next.t(key, { lng: locale, defaultValue: defaultValue ?? key });
  }

  // Reset cache when locale or tenant changes
  useEffect(() => {
    setCache({});
  }, [locale, tenantId]);

  return { t, prime, loading, cache };
}
