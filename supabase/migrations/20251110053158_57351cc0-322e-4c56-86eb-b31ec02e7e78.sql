-- Create missing RPC function for master password verification
-- This function is idempotent and transaction-safe

begin;

-- Ensure pgcrypto extension exists
create extension if not exists pgcrypto;

-- Create org_secrets table if not exists (for master password storage)
create table if not exists public.org_secrets (
  company_id uuid primary key,
  master_password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create or replace the verification function
create or replace function public.verify_master_password(p_company_id uuid, p_password text)
returns boolean
language plpgsql
security definer
strict
set search_path = public
as $$
declare
  v_hash text;
begin
  -- Priority 1: org_secrets.master_password_hash (primary source)
  select s.master_password_hash into v_hash
  from public.org_secrets s
  where s.company_id = p_company_id;

  -- Priority 2: Unternehmen.master_code_hash (fallback)
  if v_hash is null then
    begin
      select u.master_code_hash into v_hash
      from public."Unternehmen" u
      where u.id = p_company_id;
    exception 
      when undefined_table then
        v_hash := null;
      when undefined_column then
        v_hash := null;
    end;
  end if;

  -- Priority 3: Unternehmen.master_pass_hash (legacy fallback)
  if v_hash is null then
    begin
      select u.master_pass_hash into v_hash
      from public."Unternehmen" u
      where u.id = p_company_id;
    exception 
      when undefined_column then
        v_hash := null;
      when undefined_table then
        v_hash := null;
    end;
  end if;

  -- No hash found for this company
  if v_hash is null then
    return false;
  end if;

  -- Constant-time comparison using pgcrypto.crypt
  return crypt(p_password, v_hash) = v_hash;
end;
$$;

-- Grant execute permissions to required roles
grant execute on function public.verify_master_password(uuid, text) 
  to anon, authenticated, service_role;

commit;