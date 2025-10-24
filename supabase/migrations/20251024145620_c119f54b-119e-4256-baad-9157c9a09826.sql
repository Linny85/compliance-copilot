-- ============================================
-- STEP 1: Evidence Append-Only Protection
-- ============================================

-- 1. Add versioning and expiry columns to evidences
ALTER TABLE public.evidences
ADD COLUMN IF NOT EXISTS version_id UUID DEFAULT gen_random_uuid() NOT NULL,
ADD COLUMN IF NOT EXISTS supersedes UUID REFERENCES public.evidences(id),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for supersedes lookups
CREATE INDEX IF NOT EXISTS idx_evidences_supersedes ON public.evidences(supersedes);
CREATE INDEX IF NOT EXISTS idx_evidences_expires_at ON public.evidences(expires_at) WHERE expires_at IS NOT NULL;

-- 2. Create trigger function to prevent modifications (append-only enforcement)
CREATE OR REPLACE FUNCTION public.prevent_evidence_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Evidence records are immutable (append-only). Create a new version instead.';
END;
$$;

-- 3. Create trigger to block UPDATE and DELETE
DROP TRIGGER IF EXISTS trg_prevent_evidence_update_delete ON public.evidences;
CREATE TRIGGER trg_prevent_evidence_update_delete
BEFORE UPDATE OR DELETE ON public.evidences
FOR EACH ROW
EXECUTE FUNCTION public.prevent_evidence_modifications();

-- 4. Create trigger function for automatic audit logging on INSERT
CREATE OR REPLACE FUNCTION public.log_evidence_append()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    tenant_id,
    actor_id,
    action,
    entity,
    entity_id,
    payload
  ) VALUES (
    NEW.tenant_id,
    NEW.uploaded_by,
    'evidence.append',
    'evidence',
    NEW.id::text,
    jsonb_build_object(
      'control_id', NEW.control_id,
      'hash_sha256', NEW.hash_sha256,
      'file_size', NEW.file_size,
      'supersedes', NEW.supersedes,
      'version_id', NEW.version_id
    )
  );
  RETURN NEW;
END;
$$;

-- 5. Create trigger for audit logging
DROP TRIGGER IF EXISTS trg_log_evidence_append ON public.evidences;
CREATE TRIGGER trg_log_evidence_append
AFTER INSERT ON public.evidences
FOR EACH ROW
EXECUTE FUNCTION public.log_evidence_append();

-- 6. Create view for current (latest) evidences per control
CREATE OR REPLACE VIEW public.evidences_current AS
WITH latest_versions AS (
  SELECT DISTINCT ON (control_id, tenant_id)
    id,
    tenant_id,
    control_id,
    file_path,
    hash_sha256,
    file_size,
    mime_type,
    uploaded_by,
    uploaded_at,
    reviewer_id,
    reviewed_at,
    verdict,
    note,
    request_id,
    version_id,
    supersedes,
    expires_at
  FROM public.evidences
  WHERE supersedes IS NULL 
    OR id NOT IN (SELECT supersedes FROM public.evidences WHERE supersedes IS NOT NULL)
  ORDER BY control_id, tenant_id, uploaded_at DESC
)
SELECT * FROM latest_versions;

-- Grant access to view (same as base table)
GRANT SELECT ON public.evidences_current TO authenticated;

-- 7. Add comment for documentation
COMMENT ON TABLE public.evidences IS 'Append-only evidence storage. Records are immutable after creation. Use supersedes column to link newer versions.';
COMMENT ON COLUMN public.evidences.version_id IS 'Unique identifier for this version of the evidence';
COMMENT ON COLUMN public.evidences.supersedes IS 'Reference to previous version (if this is an update)';
COMMENT ON COLUMN public.evidences.expires_at IS 'Expiration timestamp for evidence validity';
COMMENT ON VIEW public.evidences_current IS 'View showing only the latest version of evidence per control';