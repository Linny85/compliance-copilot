/**
 * Resolves the appropriate locale for a request
 * Priority: X-Locale header → User preference → Tenant default → fallback 'en'
 */
export async function resolveLocale(
  supabase: any,
  req: Request,
  tenantId?: string
): Promise<string> {
  // 1. Check explicit header
  const explicit = req.headers.get('X-Locale');
  if (explicit) return explicit;

  // 2. Check user preference
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;

    if (uid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', uid)
        .maybeSingle();

      if (profile?.language) return profile.language;
    }

    // 3. Check tenant default
    if (tenantId) {
      const { data: tenant } = await supabase
        .from('Unternehmen')
        .select('default_locale')
        .eq('id', tenantId)
        .maybeSingle();

      if (tenant?.default_locale) return tenant.default_locale;
    }
  } catch (error) {
    console.error('Error resolving locale:', error);
  }

  // 4. Fallback
  return 'en';
}
