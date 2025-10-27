-- 1) Hilfs-View: zeigt fehlende Ziel-Locale pro Namespace
CREATE OR REPLACE VIEW public.v_translations_missing AS
WITH en AS (
  SELECT tenant_id, namespace, tkey, text, version
  FROM public.translations
  WHERE locale = 'en' AND approved = true
),
de AS (
  SELECT tenant_id, namespace, tkey
  FROM public.translations
  WHERE locale = 'de'
)
SELECT
  e.tenant_id,
  e.namespace,
  e.tkey,
  'en' AS from_locale,
  'de' AS to_locale
FROM en e
LEFT JOIN de d
  ON COALESCE(d.tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
   = COALESCE(e.tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
  AND d.namespace = e.namespace
  AND d.tkey = e.tkey
WHERE d.tkey IS NULL;

-- 2) Funktion: kopiert fehlende Übersetzungen von p_from_locale -> p_to_locale
CREATE OR REPLACE FUNCTION public.sync_missing_translations(
  p_namespace   TEXT,
  p_from_locale TEXT,
  p_to_locale   TEXT,
  p_tenant_id   UUID DEFAULT NULL,
  p_auto_approve BOOLEAN DEFAULT FALSE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cnt INTEGER := 0;
BEGIN
  INSERT INTO public.translations (
    tenant_id, namespace, tkey, locale, text,
    version, approved, approved_by, approved_at
  )
  SELECT
    src.tenant_id, src.namespace, src.tkey, p_to_locale, src.text,
    src.version, p_auto_approve, NULL, CASE WHEN p_auto_approve THEN now() ELSE NULL END
  FROM public.translations src
  LEFT JOIN public.translations dst
    ON COALESCE(dst.tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
       = COALESCE(src.tenant_id,'00000000-0000-0000-0000-000000000000'::uuid)
   AND dst.namespace = src.namespace
   AND dst.tkey = src.tkey
   AND dst.locale = p_to_locale
  WHERE src.locale = p_from_locale
    AND src.approved = true
    AND (p_namespace IS NULL OR src.namespace = p_namespace)
    AND (p_tenant_id IS NULL OR src.tenant_id = p_tenant_id)
    AND dst.id IS NULL;

  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RETURN v_cnt;
END;
$$;

-- 3) Direkt ausführen: alle CONTROLS von EN -> DE kopieren (global + approved=false)
SELECT public.sync_missing_translations('controls', 'en', 'de', NULL, false);