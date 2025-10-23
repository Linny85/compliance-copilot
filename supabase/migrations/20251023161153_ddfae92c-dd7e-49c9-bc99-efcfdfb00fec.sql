-- Phase 7B: Event Queue System

-- Queue für Run-Events
create table if not exists public.run_events_queue (
  id bigserial primary key,
  tenant_id uuid not null,
  run_id uuid not null,
  status text not null check (status in ('running','success','failed','partial')),
  rule_code text,
  started_at timestamptz,
  finished_at timestamptz,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Performance-Indizes
create index if not exists idx_run_events_queue_next_attempt 
  on public.run_events_queue (next_attempt_at) 
  where processed_at is null;
create index if not exists idx_run_events_queue_tenant 
  on public.run_events_queue (tenant_id);

-- RLS: Service role can do everything, tenants can read their own
alter table public.run_events_queue enable row level security;

create policy "Service role can manage all events"
on public.run_events_queue for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Tenants can read their own events"
on public.run_events_queue for select
using (tenant_id = get_user_company(auth.uid()));

-- Trigger function: Enqueue on check_runs status change
create or replace function public.trg_enqueue_run_event()
returns trigger language plpgsql security definer as $$
begin
  -- Only fire when status changes or finished_at is set
  if TG_OP = 'UPDATE' and (
    new.status is distinct from old.status 
    or (new.finished_at is not null and old.finished_at is null)
  ) then
    insert into public.run_events_queue (
      tenant_id, run_id, status, rule_code, started_at, finished_at
    )
    select 
      new.tenant_id, 
      new.id, 
      new.status, 
      r.code, 
      new.started_at, 
      new.finished_at
    from public.check_rules r
    where r.id = new.rule_id 
      and r.deleted_at is null; -- Respect soft-delete
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_runs_enqueue on public.check_runs;
create trigger trg_check_runs_enqueue
  after update on public.check_runs
  for each row execute function public.trg_enqueue_run_event();

-- Phase 7C: Security enhancements to tenant_settings

-- Add webhook security fields
alter table public.tenant_settings 
  add column if not exists webhook_domain_allowlist text[] default array[]::text[],
  add column if not exists webhook_secret text default encode(gen_random_bytes(32), 'hex');

-- Notification deliveries log
create table if not exists public.notification_deliveries (
  id bigserial primary key,
  tenant_id uuid not null,
  run_id uuid not null,
  channel text not null check (channel in ('email', 'webhook')),
  status_code int,
  attempts int not null default 1,
  duration_ms int,
  error_excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_deliveries_tenant_created
  on public.notification_deliveries (tenant_id, created_at desc);

alter table public.notification_deliveries enable row level security;

create policy "Service role can manage deliveries"
on public.notification_deliveries for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Tenants can read their own deliveries"
on public.notification_deliveries for select
using (tenant_id = get_user_company(auth.uid()));