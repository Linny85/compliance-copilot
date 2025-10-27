-- Enable RLS on translations table if not already enabled
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "translations_public_read_global" ON public.translations;
DROP POLICY IF EXISTS "translations_tenant_read" ON public.translations;

-- Allow public read access to approved global translations (tenant_id IS NULL)
CREATE POLICY "translations_public_read_global"
ON public.translations
FOR SELECT
USING (
  tenant_id IS NULL 
  AND approved = true
);

-- Allow authenticated users to read approved translations for their tenant
CREATE POLICY "translations_tenant_read"
ON public.translations
FOR SELECT
USING (
  (tenant_id IS NULL AND approved = true)
  OR (
    auth.uid() IS NOT NULL 
    AND tenant_id = (
      SELECT company_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  )
);

-- Verify we can read the NIS2-02 objective translation
SELECT namespace, tkey, locale, approved, LEFT(text, 80) as text_preview
FROM public.translations
WHERE namespace = 'controls'
  AND locale = 'de'
  AND tkey = 'catalog.NIS2.NIS2-02.objective'
  AND tenant_id IS NULL;