-- Sprint 4: Evidence Management - Tables & Storage

-- 4.1 Evidence Requests (Anforderung)
CREATE TABLE IF NOT EXISTS evidence_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Unternehmen"(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','expired','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evreq_tenant ON evidence_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evreq_control ON evidence_requests(control_id);
CREATE INDEX IF NOT EXISTS idx_evreq_status ON evidence_requests(status);

-- 4.2 Evidences (Nachweise) - Append only
CREATE TABLE IF NOT EXISTS evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Unternehmen"(id) ON DELETE CASCADE,
  request_id UUID REFERENCES evidence_requests(id) ON DELETE SET NULL,
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE RESTRICT,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  hash_sha256 TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verdict TEXT NOT NULL DEFAULT 'pending' CHECK (verdict IN ('pending','pass','fail','warn')),
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_ev_tenant ON evidences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ev_control ON evidences(control_id);
CREATE INDEX IF NOT EXISTS idx_ev_request ON evidences(request_id);
CREATE INDEX IF NOT EXISTS idx_ev_verdict ON evidences(verdict);

-- Unique constraint to prevent duplicate hash (same file)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ev_file_hash ON evidences(tenant_id, hash_sha256);

-- Enable RLS
ALTER TABLE evidence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT für Tenant-Mitglieder
CREATE POLICY evreq_select ON evidence_requests
FOR SELECT USING (
  tenant_id = get_user_company(auth.uid())
);

CREATE POLICY ev_select ON evidences
FOR SELECT USING (
  tenant_id = get_user_company(auth.uid())
);

-- INSERT nur für master_admin/admin/editor
CREATE POLICY evreq_insert ON evidence_requests
FOR INSERT WITH CHECK (
  tenant_id = get_user_company(auth.uid()) AND
  (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'editor'::app_role)
  )
);

-- Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence', 'evidence', false, 52428800, null)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY evidence_read ON storage.objects
FOR SELECT USING (
  bucket_id = 'evidence' AND
  auth.role() IS NOT NULL
);

CREATE POLICY evidence_write ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'evidence' AND
  auth.role() IS NOT NULL
);