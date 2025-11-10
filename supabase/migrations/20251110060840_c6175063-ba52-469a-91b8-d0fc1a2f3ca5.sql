-- Grant EXECUTE permissions on verify_master_password to all necessary roles (idempotent)
do $$
begin
  -- Ensure the function exists
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'verify_master_password'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid, p_password text'
  ) then
    raise exception 'Function public.verify_master_password(uuid, text) does not exist';
  end if;

  -- Grant EXECUTE to anon (if not already granted)
  if not exists (
    select 1
    from information_schema.role_routine_grants g
    where g.routine_schema = 'public'
      and g.routine_name = 'verify_master_password'
      and g.grantee = 'anon'
      and g.privilege_type = 'EXECUTE'
  ) then
    grant execute on function public.verify_master_password(uuid, text) to anon;
  end if;

  -- Grant EXECUTE to authenticated (if not already granted)
  if not exists (
    select 1
    from information_schema.role_routine_grants g
    where g.routine_schema = 'public'
      and g.routine_name = 'verify_master_password'
      and g.grantee = 'authenticated'
      and g.privilege_type = 'EXECUTE'
  ) then
    grant execute on function public.verify_master_password(uuid, text) to authenticated;
  end if;

  -- Grant EXECUTE to service_role (if not already granted)
  if not exists (
    select 1
    from information_schema.role_routine_grants g
    where g.routine_schema = 'public'
      and g.routine_name = 'verify_master_password'
      and g.grantee = 'service_role'
      and g.privilege_type = 'EXECUTE'
  ) then
    grant execute on function public.verify_master_password(uuid, text) to service_role;
  end if;
end $$;