-- Unconditional GRANT for verify_master_password (fix permission denied issue)
GRANT EXECUTE ON FUNCTION public.verify_master_password(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_master_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_master_password(uuid, text) TO service_role;