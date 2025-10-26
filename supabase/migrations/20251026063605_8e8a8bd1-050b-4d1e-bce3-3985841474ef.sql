-- 🔐 Sichere RLS-Policies für E-Mail-System (Fix)

-- Helper: Tenant-ID mit Fallback auf profile.company_id
create or replace function public.auth_tenant_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid,
    (select company_id from public.profiles where id = auth.uid() limit 1)
  )
$$;

-- Bestehende Policies droppen
drop policy if exists ej_select on public.email_jobs;
drop policy if exists ej_update_block on public.email_jobs;
drop policy if exists ej_service_all on public.email_jobs;
drop policy if exists ej_service_insert on public.email_jobs;
drop policy if exists email_jobs_insert on public.email_jobs;
drop policy if exists email_jobs_select on public.email_jobs;

drop policy if exists ee_service_all on public.email_events;
drop policy if exists email_events_select on public.email_events;

drop policy if exists es_service_all on public.email_suppressions;

-- ===== email_jobs =====
-- SELECT: Nur eigener Tenant
create policy ej_select on public.email_jobs
for select
to authenticated
using (tenant_id = public.auth_tenant_id());

-- UPDATE: App-User dürfen eigene, noch nicht versandte Jobs auf 'blocked' setzen
create policy ej_update_block on public.email_jobs
for update
to authenticated
using (
  tenant_id = public.auth_tenant_id()
  and status in ('queued','sending')
)
with check (
  tenant_id = public.auth_tenant_id()
  and status = 'blocked'
);

-- Service-Role: Vollzugriff
create policy ej_service_all on public.email_jobs
for all
to service_role
using (true)
with check (true);

-- ===== email_events =====
-- Nur Service-Role (Logs, Webhooks)
create policy ee_service_all on public.email_events
for all
to service_role
using (true)
with check (true);

-- Admin-Leserecht (wenn User admin role hat)
create policy email_events_select on public.email_events
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'master_admin')
  )
);

-- ===== email_suppressions =====
create policy es_service_all on public.email_suppressions
for all
to service_role
using (true)
with check (true);

-- Performance-Indizes (idempotent)
create index if not exists email_jobs_idx_status_sched on public.email_jobs(status, scheduled_at);
create index if not exists email_jobs_idx_tenant on public.email_jobs(tenant_id);

-- ===== Atomar claimen (sicher mit SECURITY DEFINER) =====
create or replace function public.claim_email_jobs(p_limit int)
returns setof public.email_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with cte as (
    select id
    from public.email_jobs
    where status = 'queued'
      and scheduled_at <= now()
    order by scheduled_at
    for update skip locked
    limit p_limit
  )
  update public.email_jobs j
     set status = 'sending'
  from cte
  where j.id = cte.id
  returning j.*;
end;
$$;

-- Nur Service-Role darf claimen
revoke all on function public.claim_email_jobs(int) from public, authenticated;
grant execute on function public.claim_email_jobs(int) to service_role;