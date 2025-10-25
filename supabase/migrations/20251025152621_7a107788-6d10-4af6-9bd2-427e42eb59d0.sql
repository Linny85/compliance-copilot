-- Training Certificates Security Hardening
-- 1. Add file_path column (store relative path, not public URL)
ALTER TABLE public.training_certificates
  ADD COLUMN IF NOT EXISTS file_path text;

-- 2. Make file_url nullable (transitioning to file_path)
ALTER TABLE public.training_certificates
  ALTER COLUMN file_url DROP NOT NULL;

-- 3. Add retention field for GDPR compliance
ALTER TABLE public.training_certificates
  ADD COLUMN IF NOT EXISTS retention_until timestamptz;

-- 4. Add tag field for stable mapping to training requirements
ALTER TABLE public.training_certificates
  ADD COLUMN IF NOT EXISTS training_tag text;

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_tc_tenant_created ON public.training_certificates(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_user_created ON public.training_certificates(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_status ON public.training_certificates(status);
CREATE INDEX IF NOT EXISTS idx_tc_tag ON public.training_certificates(training_tag);

-- 6. Drop old RLS policies
DROP POLICY IF EXISTS "training_certs_select" ON public.training_certificates;
DROP POLICY IF EXISTS "training_certs_insert" ON public.training_certificates;
DROP POLICY IF EXISTS "training_certs_update_admin" ON public.training_certificates;
DROP POLICY IF EXISTS "training_certs_delete_admin" ON public.training_certificates;

-- 7. Create robust RLS policies using existing helper functions
-- SELECT: All users in tenant can view certificates
CREATE POLICY "tc_select_tenant" 
ON public.training_certificates
FOR SELECT 
USING (tenant_id = get_user_company(auth.uid()));

-- INSERT: Users can upload for themselves in their tenant
CREATE POLICY "tc_insert_own" 
ON public.training_certificates
FOR INSERT 
WITH CHECK (
  tenant_id = get_user_company(auth.uid())
  AND user_id = auth.uid()
);

-- UPDATE: Only admins can update (verify/reject)
CREATE POLICY "tc_update_admin_only" 
ON public.training_certificates
FOR UPDATE 
USING (
  tenant_id = get_user_company(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role)
    OR has_role(auth.uid(), tenant_id, 'admin'::app_role)
  )
);

-- DELETE: Only master_admin can delete
CREATE POLICY "tc_delete_master_admin_only" 
ON public.training_certificates
FOR DELETE 
USING (
  tenant_id = get_user_company(auth.uid())
  AND has_role(auth.uid(), tenant_id, 'master_admin'::app_role)
);

-- 8. Update storage policies to be more restrictive
DROP POLICY IF EXISTS "training_certs_storage_upload" ON storage.objects;
DROP POLICY IF EXISTS "training_certs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "training_certs_storage_delete" ON storage.objects;

-- Storage: Upload only to own folder
CREATE POLICY "tc_storage_upload_own_folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'training-certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage: Select own files or if admin in tenant
CREATE POLICY "tc_storage_select_own"
ON storage.objects
FOR SELECT
USING (bucket_id = 'training-certificates');

-- Storage: Delete only by master_admin
CREATE POLICY "tc_storage_delete_master_only"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'training-certificates'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.company_id = ur.company_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'master_admin'::app_role
  )
);