-- Ensure RLS is enabled on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create unique index to ensure one company per creator
CREATE UNIQUE INDEX IF NOT EXISTS uniq_companies_created_by ON public.companies(created_by);

-- INSERT policy: Users can only insert with their own user_id as created_by
DROP POLICY IF EXISTS companies_insert_onboarding ON public.companies;
CREATE POLICY companies_insert_onboarding
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- SELECT policy: Users can only see companies they created
DROP POLICY IF EXISTS companies_select_owner ON public.companies;
CREATE POLICY companies_select_owner
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Users can create one company" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they belong to" ON public.companies;
DROP POLICY IF EXISTS "Master admins can update company" ON public.companies;
DROP POLICY IF EXISTS "Master admins can delete company" ON public.companies;