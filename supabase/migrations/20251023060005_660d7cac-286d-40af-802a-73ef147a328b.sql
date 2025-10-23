-- Update profiles table to allow all EU+EWR language codes
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_language_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_language_check 
CHECK (language IN (
  'en', 'de', 'sv', 'da', 'no', 'fi', 'is',
  'fr', 'it', 'es', 'pt', 'ro', 'ca',
  'nl', 'pl', 'cs', 'sk', 'sl', 'hr',
  'hu', 'bg', 'el',
  'et', 'lv', 'lt',
  'ga', 'mt'
));