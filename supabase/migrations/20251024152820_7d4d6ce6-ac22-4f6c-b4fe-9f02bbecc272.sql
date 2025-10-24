-- 1) View for evidence index (using base evidences table, filtering for current versions)
CREATE OR REPLACE VIEW public.v_evidence_index AS
SELECT
  e.id,
  e.tenant_id,
  e.control_id,
  e.request_id,
  e.hash_sha256 AS content_hash,
  e.uploaded_by AS uploader_id,
  e.reviewer_id,
  e.verdict,
  e.uploaded_at,
  e.reviewed_at,
  e.expires_at,
  e.review_status,
  e.locked,
  e.version_id,
  e.supersedes,
  e.file_path,
  e.mime_type,
  e.file_size,
  e.note
FROM public.evidences e
WHERE e.id NOT IN (
  SELECT supersedes FROM public.evidences WHERE supersedes IS NOT NULL
);

GRANT SELECT ON public.v_evidence_index TO authenticated;

-- 2) View for deviations export (check if table exists first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deviations') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.v_deviations_export AS
      SELECT
        d.id,
        d.tenant_id,
        d.control_id,
        d.scope_ref,
        d.title,
        d.description,
        d.severity,
        d.status,
        d.mitigation,
        d.valid_from,
        d.valid_to,
        d.recert_at,
        d.sla_due_at,
        d.requested_by,
        d.reviewer_id,
        d.approver_id,
        d.created_at,
        d.updated_at,
        d.source
      FROM public.deviations d
    ';
    
    EXECUTE 'GRANT SELECT ON public.v_deviations_export TO authenticated';
    RAISE NOTICE 'Created v_deviations_export view';
  ELSE
    RAISE NOTICE 'Skipping v_deviations_export - deviations table does not exist yet';
  END IF;
END $$;

-- 3) Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON public.audit_log(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evidences_current_control ON public.evidences(control_id) WHERE supersedes IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidences_tenant_uploaded ON public.evidences(tenant_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_evidences_tenant_reviewed ON public.evidences(tenant_id, reviewed_at) WHERE reviewed_at IS NOT NULL;

-- 4) Conditional indexes for deviations if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deviations') THEN
    CREATE INDEX IF NOT EXISTS idx_deviations_tenant_time ON public.deviations(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_deviations_updated ON public.deviations(tenant_id, updated_at);
    RAISE NOTICE 'Created deviations indexes';
  END IF;
END $$;

-- 5) Comments
COMMENT ON VIEW public.v_evidence_index IS 'Current evidence versions with export-relevant fields';