-- Phase 10: QA Results, Email Integration, and Storage for PDF Reports

-- 1. Create qa_results table (without FK constraint to match existing pattern)
create table if not exists public.qa_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  suite varchar(64) not null default 'default',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total integer not null default 0,
  passed integer not null default 0,
  failed integer not null default 0,
  notes text,
  created_by uuid
);

create index if not exists qa_results_tenant_started_idx on public.qa_results(tenant_id, started_at desc);

-- Enable RLS on qa_results
alter table public.qa_results enable row level security;

-- Admins can read QA results
create policy qa_results_read on public.qa_results
for select using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = qa_results.tenant_id
      and ur.role in ('admin','master_admin')
  )
);

-- Admins can insert QA results
create policy qa_results_write on public.qa_results
for insert with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = qa_results.tenant_id
      and ur.role in ('admin','master_admin')
  )
);

-- Admins can update QA results
create policy qa_results_update on public.qa_results
for update using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = qa_results.tenant_id
      and ur.role in ('admin','master_admin')
  )
);

-- 2. Create storage bucket for QA reports
insert into storage.buckets (id, name, public)
values ('qa-reports', 'qa-reports', false)
on conflict (id) do nothing;

-- RLS for qa-reports bucket - Admins can read
create policy "qa-reports-read" on storage.objects
for select using (
  bucket_id = 'qa-reports' and
  exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = auth.uid()
    where ur.user_id = auth.uid()
      and ur.company_id = p.company_id
      and ur.role in ('admin','master_admin')
  )
);

-- Admins can write to qa-reports bucket
create policy "qa-reports-write" on storage.objects
for insert with check (
  bucket_id = 'qa-reports' and
  exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = auth.uid()
    where ur.user_id = auth.uid()
      and ur.company_id = p.company_id
      and ur.role in ('admin','master_admin')
  )
);