-- Create the verify_master_password RPC function
CREATE OR REPLACE FUNCTION public.verify_master_password(
  p_company_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
STRICT
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hash text;
BEGIN
  -- Priority 1: org_secrets.master_password_hash
  SELECT s.master_password_hash INTO v_hash
  FROM public.org_secrets s
  WHERE s.company_id = p_company_id;

  -- Priority 2: Unternehmen.master_code_hash (fallback)
  IF v_hash IS NULL THEN
    BEGIN
      SELECT u.master_code_hash INTO v_hash
      FROM public."Unternehmen" u
      WHERE u.id = p_company_id;
    EXCEPTION 
      WHEN undefined_table THEN
        v_hash := NULL;
      WHEN undefined_column THEN
        v_hash := NULL;
    END;
  END IF;

  -- Priority 3: Unternehmen.master_pass_hash (legacy fallback)
  IF v_hash IS NULL THEN
    BEGIN
      SELECT u.master_pass_hash INTO v_hash
      FROM public."Unternehmen" u
      WHERE u.id = p_company_id;
    EXCEPTION 
      WHEN undefined_table THEN
        v_hash := NULL;
      WHEN undefined_column THEN
        v_hash := NULL;
    END;
  END IF;

  -- No hash found
  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Constant-time comparison using pgcrypto's crypt
  RETURN crypt(p_password, v_hash) = v_hash;
END;
$$;

-- Grant EXECUTE rights to all necessary roles
GRANT EXECUTE ON FUNCTION public.verify_master_password(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_master_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_master_password(uuid, text) TO service_role;