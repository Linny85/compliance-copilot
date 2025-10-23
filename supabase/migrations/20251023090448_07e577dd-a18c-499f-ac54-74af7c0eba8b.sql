-- Sprint 1: Audit-Trail System
-- Erstellt eine zentrale audit_log Tabelle für alle Compliance-Events

CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für Performance bei häufigen Abfragen
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON public.audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity, entity_id);

-- RLS aktivieren
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Mitglieder können Audit-Logs ihres Tenants lesen
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT
  USING (
    tenant_id = get_user_company(auth.uid())
  );

-- Schreiben nur über Edge Functions (Service Role), keine direkte INSERT-Policy für User