-- Härtung 1: Rate-Limiting Tabelle
CREATE TABLE IF NOT EXISTS public.mpw_rate_limiter (
  company_id uuid NOT NULL,
  ip inet NOT NULL,
  window_start timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  attempts int NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, ip, window_start)
);

-- Index für schnelle Cleanup-Abfragen
CREATE INDEX IF NOT EXISTS idx_mpw_rate_limiter_window 
  ON public.mpw_rate_limiter(window_start);

-- Härtung 2: Audit-Logging Tabelle
CREATE TABLE IF NOT EXISTS public.mpw_audit_log (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  ip inet,
  ok boolean NOT NULL,
  reason text,
  user_agent text
);

-- Index für Performance bei Abfragen
CREATE INDEX IF NOT EXISTS idx_mpw_audit_log_company_ts 
  ON public.mpw_audit_log(company_id, ts DESC);

-- Härtung 3: Master-Passwort-Reset RPC (ADMIN-ONLY)
CREATE OR REPLACE FUNCTION public.reset_master_password(
  p_company_id uuid, 
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update existing hash in org_secrets
  UPDATE public.org_secrets
  SET master_password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE company_id = p_company_id;
  
  IF NOT FOUND THEN
    -- Insert new hash if doesn't exist
    INSERT INTO public.org_secrets(company_id, master_password_hash)
    VALUES (p_company_id, crypt(p_new_password, gen_salt('bf')));
  END IF;
  
  -- Audit log the reset
  INSERT INTO public.mpw_audit_log(company_id, ok, reason)
  VALUES (p_company_id, true, 'password_reset');
  
  RETURN true;
END;
$$;

-- CRITICAL: Only service_role can reset passwords (no anon/authenticated!)
REVOKE ALL ON FUNCTION public.reset_master_password(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reset_master_password(uuid, text) TO service_role;

-- Helper function: Check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_mpw_rate_limit(
  p_company_id uuid,
  p_ip inet,
  p_max_attempts int DEFAULT 5,
  p_window_minutes int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start timestamptz;
  v_attempts int;
  v_allowed boolean;
BEGIN
  -- Calculate current window start (truncate to minute)
  v_window_start := date_trunc('minute', now());
  
  -- Upsert attempt counter
  INSERT INTO public.mpw_rate_limiter(company_id, ip, window_start, attempts)
  VALUES (p_company_id, p_ip, v_window_start, 1)
  ON CONFLICT (company_id, ip, window_start) 
  DO UPDATE SET attempts = mpw_rate_limiter.attempts + 1
  RETURNING attempts INTO v_attempts;
  
  -- Cleanup old windows (older than p_window_minutes)
  DELETE FROM public.mpw_rate_limiter
  WHERE window_start < now() - make_interval(mins => p_window_minutes);
  
  -- Check if rate limit exceeded
  v_allowed := v_attempts <= p_max_attempts;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'attempts', v_attempts,
    'remaining', GREATEST(0, p_max_attempts - v_attempts)
  );
END;
$$;

-- Grant execute to anon/authenticated for rate limit checks
GRANT EXECUTE ON FUNCTION public.check_mpw_rate_limit(uuid, inet, int, int) TO anon;
GRANT EXECUTE ON FUNCTION public.check_mpw_rate_limit(uuid, inet, int, int) TO authenticated;