
-- Email job status enum
CREATE TYPE email_status AS ENUM ('queued', 'sending', 'sent', 'failed', 'blocked');

-- Email jobs queue
CREATE TABLE public.email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  to_email text NOT NULL,
  template_alias text NOT NULL,
  model jsonb NOT NULL DEFAULT '{}',
  message_stream text NOT NULL DEFAULT 'outbound',
  status email_status NOT NULL DEFAULT 'queued',
  retry_count int NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_jobs_status_scheduled ON public.email_jobs (status, scheduled_at);
CREATE INDEX idx_email_jobs_tenant ON public.email_jobs (tenant_id);

-- Email events (bounces, spam, etc.)
CREATE TABLE public.email_events (
  id bigserial PRIMARY KEY,
  message_id text,
  event_type text NOT NULL,
  email text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_email_events_email ON public.email_events (email);
CREATE INDEX idx_email_events_type ON public.email_events (event_type);

-- Email suppression list
CREATE TABLE public.email_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Policies for email_jobs
CREATE POLICY email_jobs_select ON public.email_jobs
FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY email_jobs_insert ON public.email_jobs
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

-- Policies for email_events (admin view only)
CREATE POLICY email_events_select ON public.email_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'master_admin')
  )
);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.email_jobs TO authenticated;
GRANT SELECT ON public.email_events TO authenticated;
GRANT SELECT ON public.email_suppressions TO authenticated;
