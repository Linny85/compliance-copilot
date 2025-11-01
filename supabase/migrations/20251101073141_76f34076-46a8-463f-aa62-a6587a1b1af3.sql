-- Fix RLS for org_secrets to allow service role access

drop policy if exists org_secrets_no_direct_access on public.org_secrets;

-- Allow service role (edge functions) to read/write
create policy org_secrets_service_access on public.org_secrets
  for all
  using (true)
  with check (true);