-- 14-Tage-Trial-System mit Billing-Status (korrigiert für company_id)

-- 1) Subscriptions Tabelle
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'active',
  trial_start timestamptz,
  trial_end timestamptz,
  stripe_customer_id text,
  stripe_sub_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Eindeutigkeit pro Company
CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_company
  ON public.subscriptions (company_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end
  ON public.subscriptions (trial_end);

-- 2) Billing-Status View
CREATE OR REPLACE VIEW public.v_billing_status AS
SELECT
  s.company_id,
  s.plan,
  s.status,
  s.trial_start,
  s.trial_end,
  GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(s.trial_end, now()) - now())) / 86400))::int AS trial_days_left,
  (s.trial_end IS NOT NULL AND now() < s.trial_end) AS trial_active,
  (s.status = 'active' AND s.plan <> 'trial') AS paid_active
FROM subscriptions s;

-- 3) RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subs_select ON public.subscriptions;
CREATE POLICY subs_select ON public.subscriptions
FOR SELECT TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS subs_insert ON public.subscriptions;
CREATE POLICY subs_insert ON public.subscriptions
FOR INSERT TO authenticated
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS subs_update ON public.subscriptions;
CREATE POLICY subs_update ON public.subscriptions
FOR UPDATE TO authenticated
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 4) RPC: Trial starten/zurücksetzen
CREATE OR REPLACE FUNCTION public.start_or_reset_trial(days integer DEFAULT 14)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS
$$
DECLARE
  t uuid;
  u uuid := auth.uid();
  rec public.subscriptions;
BEGIN
  -- Company-ID aus Profil holen
  SELECT company_id INTO t FROM public.profiles WHERE id = u;
  
  IF t IS NULL THEN
    RAISE EXCEPTION 'No company found for user';
  END IF;

  -- Subscription anlegen oder aktualisieren
  INSERT INTO public.subscriptions (user_id, company_id, plan, status, trial_start, trial_end)
  VALUES (u, t, 'trial', 'active', now(), now() + make_interval(days => days))
  ON CONFLICT (company_id) DO UPDATE
    SET plan = 'trial',
        status = 'active',
        trial_start = EXCLUDED.trial_start,
        trial_end = EXCLUDED.trial_end,
        updated_at = now()
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

REVOKE ALL ON FUNCTION public.start_or_reset_trial(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_or_reset_trial(integer) TO authenticated;