-- Idempotent RPC creation with full fallback chain
begin;

create extension if not exists pgcrypto;

create table if not exists public.org_secrets (
  company_id uuid primary key,
  master_password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  -- Priority 1: org_secrets.master_password_hash
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
      when undefined_table then
        v_hash := null;
      when undefined_column then
        v_hash := null;
    end;
  end if;

  -- No hash found
  if v_hash is null then
    return false;
  end if;

  -- Constant-time comparison
  return crypt(p_password, v_hash) = v_hash;
end;
$$;

grant execute on function public.verify_master_password(uuid, text) 
to anon, authenticated, service_role;

commit;