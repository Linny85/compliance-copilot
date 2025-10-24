-- 1) Create or replace updated_at trigger function (may already exist from deviations)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Extend evidences table for review workflow
ALTER TABLE public.evidences
  ADD COLUMN IF NOT EXISTS review_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('pending','scheduled','in_review','completed','expired')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_evidences_review_status ON public.evidences(review_status);
CREATE INDEX IF NOT EXISTS idx_evidences_expires_at ON public.evidences(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidences_locked ON public.evidences(locked);

-- 3) Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  kind TEXT NOT NULL,
  ref_table TEXT NOT NULL,
  ref_id UUID NOT NULL,
  assignee_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','canceled')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status_due ON public.tasks(tenant_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_ref ON public.tasks(ref_table, ref_id);
CREATE INDEX IF NOT EXISTS idx_tasks_kind_status ON public.tasks(kind, status);

-- 4) Trigger for tasks.updated_at
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at 
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT
  USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT
  WITH CHECK (tenant_id = get_user_company(auth.uid()));

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE
  USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE
  USING (
    tenant_id = get_user_company(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'admin') OR has_role(auth.uid(), tenant_id, 'master_admin'))
  );

-- 6) Grant service role access
GRANT SELECT, INSERT, UPDATE ON public.evidences TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.tasks TO service_role;

-- 7) Service function for bulk evidence updates
CREATE OR REPLACE FUNCTION public.svc_evidence_bulk_update(p_updates JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  r JSONB; 
  cnt INT := 0;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE public.evidences
      SET review_status = COALESCE((r->>'review_status')::TEXT, review_status),
          locked = COALESCE((r->>'locked')::BOOLEAN, locked),
          review_due_at = COALESCE((r->>'review_due_at')::TIMESTAMPTZ, review_due_at)
    WHERE id = (r->>'id')::UUID;
    
    IF FOUND THEN
      cnt := cnt + 1;
    END IF;
  END LOOP;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.svc_evidence_bulk_update TO service_role;

COMMENT ON TABLE public.tasks IS 'Task tracking for evidence reviews, deviations, and other workflow items';
COMMENT ON COLUMN public.evidences.review_status IS 'Current review status of evidence';
COMMENT ON COLUMN public.evidences.locked IS 'If true, evidence is locked due to expiry or other reasons';
COMMENT ON COLUMN public.evidences.review_due_at IS 'When this evidence should be reviewed';
COMMENT ON FUNCTION public.svc_evidence_bulk_update IS 'Service function for bulk updating evidence status (used by cron jobs)';