-- Master password secrets table with audit trail
CREATE TABLE IF NOT EXISTS public.org_secrets (
  tenant_id uuid PRIMARY KEY,
  master_hash text NOT NULL,
  version int NOT NULL DEFAULT 1,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.org_secret_audit (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  user_id uuid,
  event text NOT NULL CHECK (event IN ('master.set','master.rotate','master.verify.ok','master.verify.fail','master.locked','master.unlocked')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_secrets_locked ON public.org_secrets(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.org_secret_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON public.org_secret_audit(event, created_at DESC);

-- Enable RLS
ALTER TABLE public.org_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_secret_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_secrets (read-only via service role in edge functions)
DROP POLICY IF EXISTS org_secrets_service_all ON public.org_secrets;
CREATE POLICY org_secrets_service_all ON public.org_secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for audit (users can read their own tenant's audit log)
DROP POLICY IF EXISTS org_secret_audit_tenant_read ON public.org_secret_audit;
CREATE POLICY org_secret_audit_tenant_read ON public.org_secret_audit
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS org_secret_audit_service_write ON public.org_secret_audit;
CREATE POLICY org_secret_audit_service_write ON public.org_secret_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);