-- Performance-Indizes für Email-System
create index if not exists email_queue_status_sched_idx 
  on public.email_queue (status, scheduled_at, created_at);
create index if not exists email_queue_template_idx 
  on public.email_queue (template_code);
create index if not exists email_events_created_idx 
  on public.email_events (occurred_at);

-- Tenant-ID-Helper für RLS
create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select nullif((current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::text,'')::uuid
$$;

-- RLS-Policies für email_queue (Tenant-Isolation)
drop policy if exists queue_select_own on public.email_queue;
create policy queue_select_own on public.email_queue
  for select to authenticated
  using (tenant_id = public.current_tenant_id() or tenant_id is null);

drop policy if exists queue_insert_own on public.email_queue;
create policy queue_insert_own on public.email_queue
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id());

-- RLS für Views (Admin-Zugriff)
grant select on public.v_email_events_norm to authenticated;
grant select on public.v_email_last_status to authenticated;
grant select on public.v_email_stats to authenticated;

-- Housekeeping-Funktion für alte Events (90 Tage)
create or replace function public.cleanup_old_email_events(days_to_keep integer default 90)
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.email_events
  where occurred_at < now() - make_interval(days => days_to_keep);
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Housekeeping-Funktion für alte Queue-Einträge (180 Tage)
create or replace function public.cleanup_old_queue_entries(days_to_keep integer default 180)
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.email_queue
  where created_at < now() - make_interval(days => days_to_keep)
    and status in ('sent', 'failed');
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;