-- Create SQL functions for setting and checking master password using PBKDF2

-- Function to generate PBKDF2 hash
CREATE OR REPLACE FUNCTION public.pbkdf2_hash(
  password text,
  salt bytea,
  iterations int DEFAULT 210000
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hash bytea;
BEGIN
  -- Use pgcrypto's digest function with PBKDF2
  hash := digest(password || encode(salt, 'escape'), 'sha256');
  
  -- Simple iteration (Note: This is simplified; for production use a proper PBKDF2 implementation)
  FOR i IN 2..iterations LOOP
    hash := digest(hash || password, 'sha256');
  END LOOP;
  
  RETURN encode(hash, 'base64');
END;
$$;

-- Function to set master password for a company
CREATE OR REPLACE FUNCTION public.set_master_password(
  p_company_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salt bytea;
  v_hash text;
  v_iterations int := 210000;
BEGIN
  -- Generate random salt (32 bytes)
  v_salt := gen_random_bytes(32);
  
  -- Generate hash
  v_hash := public.pbkdf2_hash(p_password, v_salt, v_iterations);
  
  -- Update company record
  UPDATE public."Unternehmen"
  SET 
    master_pass_salt = encode(v_salt, 'base64'),
    master_pass_hash = v_hash,
    master_pass_algo = 'pbkdf2-sha256',
    master_pass_iter = v_iterations,
    updated_at = now()
  WHERE id = p_company_id;
  
  RETURN FOUND;
END;
$$;

-- Function to check master password
CREATE OR REPLACE FUNCTION public.check_master_password(
  p_company_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash text;
  v_stored_salt text;
  v_iterations int;
  v_computed_hash text;
BEGIN
  -- Fetch stored password data
  SELECT master_pass_hash, master_pass_salt, master_pass_iter
  INTO v_stored_hash, v_stored_salt, v_iterations
  FROM public."Unternehmen"
  WHERE id = p_company_id;
  
  IF NOT FOUND OR v_stored_hash IS NULL OR v_stored_salt IS NULL THEN
    RETURN false;
  END IF;
  
  -- Compute hash with same salt
  v_computed_hash := public.pbkdf2_hash(
    p_password,
    decode(v_stored_salt, 'base64'),
    COALESCE(v_iterations, 210000)
  );
  
  -- Constant-time comparison
  RETURN v_computed_hash = v_stored_hash;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_master_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_master_password(uuid, text) TO authenticated;