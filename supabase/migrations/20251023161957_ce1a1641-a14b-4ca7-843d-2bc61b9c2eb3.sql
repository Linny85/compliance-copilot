-- Phase 7B-9: Finishing Pass & Hardening

-- 1) Dead-Letter Queue
create table if not exists public.run_events_deadletter (
  id bigserial primary key,
  original_id bigint not null,
  tenant_id uuid not null,
  run_id uuid not null,
  status text not null,
  rule_code text,
  started_at timestamptz,
  finished_at timestamptz,
  attempts int not null,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_run_events_deadletter_tenant 
  on public.run_events_deadletter (tenant_id, created_at desc);

alter table public.run_events_deadletter enable row level security;

create policy "Service role can manage deadletter"
on public.run_events_deadletter for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Tenants can read their own deadletter"
on public.run_events_deadletter for select
using (tenant_id = get_user_company(auth.uid()));

-- 2) Retention & Cleanup Functions
create or replace function public.cleanup_run_events()
returns void 
language sql 
security definer
set search_path = public
as $$
  delete from public.run_events_queue
  where processed_at is not null
    and processed_at < now() - interval '30 days';
$$;

create or replace function public.cleanup_notification_deliveries()
returns void 
language sql 
security definer
set search_path = public
as $$
  delete from public.notification_deliveries
  where created_at < now() - interval '90 days';
$$;

-- 3) Soft-Delete Enforcement Views
create or replace view public.v_check_rules_active as
select *
from public.check_rules
where deleted_at is null;

create or replace view public.v_check_results_join as
select 
  r.id,
  r.run_id,
  r.outcome,
  r.message,
  r.details,
  r.created_at,
  r.tenant_id,
  ru.status as run_status,
  ru.window_start,
  ru.window_end,
  cr.id as rule_id,
  cr.code as rule_code,
  cr.title as rule_title,
  cr.severity,
  cr.control_id
from public.check_results r
join public.check_runs ru on ru.id = r.run_id
join public.v_check_rules_active cr on cr.id = r.rule_id;

-- 4) Search Performance (pg_trgm)
create extension if not exists pg_trgm;

create index if not exists idx_controls_title_trgm 
  on public.controls using gin (title gin_trgm_ops);
create index if not exists idx_controls_code_trgm 
  on public.controls using gin (code gin_trgm_ops);
create index if not exists idx_rules_title_trgm 
  on public.check_rules using gin (title gin_trgm_ops);
create index if not exists idx_rules_code_trgm 
  on public.check_rules using gin (code gin_trgm_ops);