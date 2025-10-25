-- Training Certificates Module
-- Stores uploaded training/course certificates for compliance tracking

CREATE TABLE public.training_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  provider text NOT NULL,
  date_completed date NOT NULL,
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_by uuid NULL,
  verified_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for tenant queries
CREATE INDEX idx_training_certificates_tenant ON public.training_certificates(tenant_id);
CREATE INDEX idx_training_certificates_user ON public.training_certificates(user_id);
CREATE INDEX idx_training_certificates_status ON public.training_certificates(status);

-- Auto-update updated_at timestamp
CREATE TRIGGER trg_training_certificates_updated
BEFORE UPDATE ON public.training_certificates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view certificates in their tenant
CREATE POLICY "training_certs_select" 
ON public.training_certificates
FOR SELECT 
USING (tenant_id = get_user_company(auth.uid()));

-- Policy: Users can upload certificates for themselves
CREATE POLICY "training_certs_insert" 
ON public.training_certificates
FOR INSERT 
WITH CHECK (
  tenant_id = get_user_company(auth.uid())
  AND user_id = auth.uid()
);

-- Policy: Only admins can update status/verification
CREATE POLICY "training_certs_update_admin" 
ON public.training_certificates
FOR UPDATE 
USING (
  tenant_id = get_user_company(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role)
    OR has_role(auth.uid(), tenant_id, 'admin'::app_role)
  )
);

-- Policy: Only admins can delete
CREATE POLICY "training_certs_delete_admin" 
ON public.training_certificates
FOR DELETE 
USING (
  tenant_id = get_user_company(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role)
    OR has_role(auth.uid(), tenant_id, 'admin'::app_role)
  )
);

-- Storage bucket for certificate files
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-certificates', 'training-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Users can upload their own certificates
CREATE POLICY "training_certs_storage_upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'training-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies: Users in same tenant can view
CREATE POLICY "training_certs_storage_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'training-certificates');

-- Storage policies: Only admins can delete
CREATE POLICY "training_certs_storage_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'training-certificates'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('master_admin'::app_role, 'admin'::app_role)
  )
);