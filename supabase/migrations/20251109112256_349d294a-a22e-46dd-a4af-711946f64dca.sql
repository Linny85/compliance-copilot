-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create secure master password verification function
-- SECURITY DEFINER ensures it runs with creator privileges, not caller
-- This allows checking passwords without exposing the hash table to anon users
CREATE OR REPLACE FUNCTION public.verify_master_password(
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
BEGIN
  -- Fetch stored hash for the company
  SELECT master_code_hash
  INTO v_stored_hash
  FROM public."Unternehmen"
  WHERE id = p_company_id;

  -- If no hash found, password is invalid
  IF v_stored_hash IS NULL THEN
    RETURN false;
  END IF;

  -- Compare provided password with stored hash using crypt
  RETURN crypt(p_password, v_stored_hash) = v_stored_hash;
END;
$$;

-- Revoke all default permissions
REVOKE ALL ON FUNCTION public.verify_master_password(uuid, text) FROM PUBLIC;

-- Grant execute only to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.verify_master_password(uuid, text) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.verify_master_password IS 
  'Securely verifies master password for a company without exposing password hashes. Rate limiting should be implemented at application layer.';