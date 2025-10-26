-- Helper: Tenant-ID aus JWT oder Profile
create or replace function public.auth_tenant_id()
returns uuid language sql stable security definer as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid,
    (select company_id from public.profiles where id = auth.uid() limit 1)
  )
$$;

-- RLS für email_jobs
alter table public.email_jobs enable row level security;

drop policy if exists ej_select on public.email_jobs;
create policy ej_select on public.email_jobs
for select
to authenticated
using (tenant_id = public.auth_tenant_id());

drop policy if exists ej_update_block on public.email_jobs;
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

drop policy if exists ej_service_insert on public.email_jobs;
create policy ej_service_insert on public.email_jobs
for insert
with check (true);

drop policy if exists ej_service_all on public.email_jobs;
create policy ej_service_all on public.email_jobs
for all
using (true);

-- RLS für email_events
alter table public.email_events enable row level security;

drop policy if exists ee_service_all on public.email_events;
create policy ee_service_all on public.email_events
for all
using (true);

-- RLS für email_suppressions
alter table public.email_suppressions enable row level security;

drop policy if exists es_service_all on public.email_suppressions;
create policy es_service_all on public.email_suppressions
for all
using (true);

-- Performance-Indizes
create index if not exists email_jobs_idx_status_sched on public.email_jobs(status, scheduled_at);
create index if not exists email_jobs_idx_tenant on public.email_jobs(tenant_id);

-- Atomares Claimen von Jobs (verhindert Doppelversand)
create or replace function public.claim_email_jobs(p_limit int)
returns setof public.email_jobs
language plpgsql
security definer
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

-- Locale in profiles falls nicht vorhanden
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'locale'
  ) then
    alter table public.profiles add column locale text default 'de';
  end if;
end $$;