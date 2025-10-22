-- Fix search_path for create_audit_log function
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _company_id UUID,
  _actor_user_id UUID,
  _action TEXT,
  _target TEXT,
  _meta_json JSONB DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    company_id,
    actor_user_id,
    action,
    target,
    meta_json,
    ip_address
  ) VALUES (
    _company_id,
    _actor_user_id,
    _action,
    _target,
    _meta_json,
    _ip_address
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Fix search_path for create_company_subscription function
CREATE OR REPLACE FUNCTION public.create_company_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    company_id,
    status,
    trial_start,
    trial_end
  ) VALUES (
    NEW.id,
    'trial',
    NOW(),
    NOW() + INTERVAL '14 days'
  );
  
  RETURN NEW;
END;
$$;