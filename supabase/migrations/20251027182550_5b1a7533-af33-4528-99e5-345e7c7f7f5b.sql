-- Create column openai_api_key wherever the tenant record lives (idempotent)
DO $$
BEGIN
  -- Variant A: tenant_settings (preferred)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='tenant_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='tenant_settings' AND column_name='openai_api_key'
    ) THEN
      ALTER TABLE public.tenant_settings ADD COLUMN openai_api_key TEXT NULL;
    END IF;
  END IF;

  -- Variant B: tenants
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='tenants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='tenants' AND column_name='openai_api_key'
    ) THEN
      ALTER TABLE public.tenants ADD COLUMN openai_api_key TEXT NULL;
    END IF;
  END IF;

  -- Variant C: unternehmen
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='unternehmen'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='unternehmen' AND column_name='openai_api_key'
    ) THEN
      ALTER TABLE public.unternehmen ADD COLUMN openai_api_key TEXT NULL;
    END IF;
  END IF;

  -- Variant D: "Unternehmen" (quoted)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='Unternehmen'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='Unternehmen' AND column_name='openai_api_key'
    ) THEN
      ALTER TABLE public."Unternehmen" ADD COLUMN openai_api_key TEXT NULL;
    END IF;
  END IF;
END$$;