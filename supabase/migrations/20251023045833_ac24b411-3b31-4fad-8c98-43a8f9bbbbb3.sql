-- Add default_locale column to Unternehmen table for tenant-level language preference
ALTER TABLE public."Unternehmen"
  ADD COLUMN IF NOT EXISTS default_locale TEXT DEFAULT 'en'
  CHECK (default_locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

COMMENT ON COLUMN public."Unternehmen".default_locale IS 'Default language/locale for the entire company (ISO 639-1 or BCP-47 format)';