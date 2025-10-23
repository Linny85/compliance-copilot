-- QA Monitor Table (without FK constraint as company table structure is unclear)
create table if not exists public.qa_monitor (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  last_run_id uuid,
  last_run_status text,
  last_run_at timestamptz,
  avg_latency_ms numeric,
  failed_24h integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint qa_monitor_tenant_unique unique (tenant_id)
);

create index if not exists qa_monitor_tenant_idx on public.qa_monitor(tenant_id);

-- RLS Policies
alter table public.qa_monitor enable row level security;

drop policy if exists qa_monitor_read on public.qa_monitor;
create policy qa_monitor_read on public.qa_monitor
for select using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = qa_monitor.tenant_id
      and ur.role in ('admin','master_admin')
  )
);

drop policy if exists qa_monitor_write on public.qa_monitor;
create policy qa_monitor_write on public.qa_monitor
for update using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = qa_monitor.tenant_id
      and ur.role in ('admin','master_admin')
  )
);

drop policy if exists qa_monitor_insert on public.qa_monitor;
create policy qa_monitor_insert on public.qa_monitor
for insert with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = qa_monitor.tenant_id
      and ur.role in ('admin','master_admin')
  )
);