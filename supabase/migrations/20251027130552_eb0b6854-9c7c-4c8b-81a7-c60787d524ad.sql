-- Auto-sync all missing DE translations from EN with auto-approve
-- This ensures the German translations are immediately visible
SELECT public.sync_missing_translations(NULL, 'en', 'de', NULL, true);

-- Verify the sync worked for key controls
SELECT 
  namespace,
  tkey,
  locale,
  approved,
  LEFT(text, 60) as text_preview
FROM public.translations
WHERE namespace = 'controls'
  AND locale = 'de'
  AND tkey LIKE '%objective'
ORDER BY tkey
LIMIT 20;