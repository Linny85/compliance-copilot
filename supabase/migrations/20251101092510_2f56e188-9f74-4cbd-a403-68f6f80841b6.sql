-- Add missing security columns to org_secrets table
ALTER TABLE public.org_secrets 
ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamptz DEFAULT NULL;

-- Create index for faster lockout checks
CREATE INDEX IF NOT EXISTS idx_org_secrets_locked ON public.org_secrets(locked_until) WHERE locked_until IS NOT NULL;