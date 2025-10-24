-- Grant service role access to audit functions for automated processes
GRANT EXECUTE ON FUNCTION public.compute_audit_hash TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_verify_chain TO service_role;
GRANT EXECUTE ON FUNCTION public.jsonb_canon TO service_role;

-- Create service role policy for audit_log (for automated systems)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_log' AND policyname='audit_log_service_insert') THEN
    CREATE POLICY audit_log_service_insert ON public.audit_log
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END$$;

COMMENT ON FUNCTION public.compute_audit_hash IS 'Computes SHA256 hash for audit event including previous hash in chain';
COMMENT ON FUNCTION public.jsonb_canon IS 'Canonical JSON serialization for deterministic hashing';