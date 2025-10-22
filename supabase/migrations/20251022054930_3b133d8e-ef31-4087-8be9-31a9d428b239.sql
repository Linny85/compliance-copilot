-- Add missing fields to companies table for comprehensive company profile
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS vat_id TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT;

-- Update companies table to make address nullable since we now have structured address fields
ALTER TABLE public.companies 
ALTER COLUMN address DROP NOT NULL;

-- Add index on profiles for faster company lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- Add index on subscriptions for tenant queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);

-- Add index on audit_logs for tenant activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_tenant ON public.audit_logs(company_id, created_at DESC);