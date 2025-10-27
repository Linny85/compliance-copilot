-- === PHASE 7: Postmark Mail Queue + Events ===

-- 0) Enum & Tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    CREATE TYPE public.email_status AS ENUM ('queued','sending','sent','failed','cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  subject text NOT NULL,
  template_html text,
  postmark_template_id int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  to_email text NOT NULL,
  to_name text,
  template_code text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.email_status NOT NULL DEFAULT 'queued',
  last_error text,
  attempts int NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_queue_status_scheduled_idx
  ON public.email_queue (status, scheduled_at NULLS FIRST, created_at);

CREATE TABLE IF NOT EXISTS public.email_events (
  id bigserial PRIMARY KEY,
  queue_id uuid REFERENCES public.email_queue(id) ON DELETE SET NULL,
  event text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1) RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_read ON public.email_templates;
CREATE POLICY templates_read ON public.email_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS queue_select_own ON public.email_queue;
CREATE POLICY queue_select_own ON public.email_queue
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS queue_insert ON public.email_queue;
CREATE POLICY queue_insert ON public.email_queue
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS events_read ON public.email_events;
CREATE POLICY events_read ON public.email_events
  FOR SELECT TO authenticated USING (true);

-- 2) Default-Template
INSERT INTO public.email_templates (code, subject, template_html, postmark_template_id)
VALUES
  ('ai_act_training_reminder',
   'AI Act Training – Erinnerung',
   '<html><body><h2>Hallo {{name}},</h2><p>dies ist deine Erinnerung für das AI-Act-Training.</p><p>Tenant: {{tenant_name}}</p></body></html>',
   NULL)
ON CONFLICT (code) DO NOTHING;

-- 3) RPC: enqueue_email
CREATE OR REPLACE FUNCTION public.enqueue_email(
  p_tenant_id uuid,
  p_to_email text,
  p_to_name text,
  p_template_code text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_scheduled_at timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.email_queue(id, tenant_id, to_email, to_name, template_code, payload, scheduled_at)
  VALUES (v_id, p_tenant_id, p_to_email, p_to_name, p_template_code, COALESCE(p_payload, '{}'::jsonb), p_scheduled_at);

  INSERT INTO public.email_events(queue_id, event, meta)
  VALUES (v_id, 'queued', jsonb_build_object('template_code', p_template_code));

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_email(uuid, text, text, text, jsonb, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.enqueue_email(uuid, text, text, text, jsonb, timestamptz) TO authenticated;

-- 4) View: nächste zu sendenden Mails
CREATE OR REPLACE VIEW public.v_email_next AS
SELECT q.*
FROM public.email_queue q
WHERE q.status = 'queued'
  AND (q.scheduled_at IS NULL OR q.scheduled_at <= now())
  AND (q.attempts < 5)
ORDER BY q.created_at ASC
LIMIT 25;