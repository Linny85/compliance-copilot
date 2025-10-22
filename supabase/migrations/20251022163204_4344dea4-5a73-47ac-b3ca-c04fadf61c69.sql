-- Add created_by column to companies table to track the original creator
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- For existing companies, set created_by based on the master_admin role
-- This ensures data consistency for existing records
UPDATE public.companies c
SET created_by = ur.user_id
FROM public.user_roles ur
WHERE c.id = ur.company_id 
  AND ur.role = 'master_admin'
  AND c.created_by IS NULL;

-- Add unique constraint to ensure one company per creator
ALTER TABLE public.companies 
  ADD CONSTRAINT companies_created_by_unique UNIQUE (created_by);

-- Update RLS policies for single-company-per-creator pattern

-- INSERT: Only authenticated users can create, and created_by must match auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create companies during onboarding" ON public.companies;
CREATE POLICY "Users can create one company"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- SELECT: Users can view companies they created or where they have a role
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view companies they belong to"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR id IN (
      SELECT company_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Only master_admin can update company details
DROP POLICY IF EXISTS "Master admins can update their company" ON public.companies;
CREATE POLICY "Master admins can update company"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), id, 'master_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), id, 'master_admin'::app_role));

-- DELETE: Only master_admin can delete
DROP POLICY IF EXISTS "Master admins can delete company" ON public.companies;
CREATE POLICY "Master admins can delete company"
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), id, 'master_admin'::app_role));

-- Add index for better query performance on created_by lookups
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);