-- Create audit_tasks table for storing audit entries
CREATE TABLE IF NOT EXISTS public.audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  findings TEXT,
  corrective_actions TEXT,
  assigned_to UUID,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  report_generated_at TIMESTAMPTZ,
  last_report_path TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see tasks in their tenant
CREATE POLICY "Tenant-scoped audit tasks select"
  ON public.audit_tasks
  FOR SELECT
  USING (tenant_id = get_user_company(auth.uid()));

-- RLS Policy: Users can insert tasks for their tenant
CREATE POLICY "Tenant-scoped audit tasks insert"
  ON public.audit_tasks
  FOR INSERT
  WITH CHECK (
    tenant_id = get_user_company(auth.uid()) 
    AND created_by = auth.uid()
  );

-- RLS Policy: Users can update tasks in their tenant
CREATE POLICY "Tenant-scoped audit tasks update"
  ON public.audit_tasks
  FOR UPDATE
  USING (tenant_id = get_user_company(auth.uid()));

-- Create index for performance
CREATE INDEX idx_audit_tasks_tenant ON public.audit_tasks(tenant_id);
CREATE INDEX idx_audit_tasks_status ON public.audit_tasks(status);
CREATE INDEX idx_audit_tasks_assigned ON public.audit_tasks(assigned_to);

-- Create reports storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS for reports bucket - users can only access their tenant's reports
CREATE POLICY "Tenant-scoped reports access"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reports' 
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Allow authenticated users to upload reports to their tenant folder
CREATE POLICY "Users can upload reports to tenant folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audit_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_tasks_updated_at
  BEFORE UPDATE ON public.audit_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_tasks_updated_at();