-- Phase 7: Notification system tables (corrected)

-- tenant_settings table for notification configuration
create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique,
  notification_email text,
  notification_webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_settings_tenant_idx on public.tenant_settings (tenant_id);

-- Enable RLS
alter table public.tenant_settings enable row level security;

-- Users can read their tenant's settings
create policy "Users can view their tenant settings"
on public.tenant_settings for select
using (tenant_id = get_user_company(auth.uid()));

-- Admins can update settings
create policy "Admins can update tenant settings"
on public.tenant_settings for update
using (
  tenant_id = get_user_company(auth.uid()) 
  and (
    has_role(auth.uid(), tenant_id, 'admin') 
    or has_role(auth.uid(), tenant_id, 'master_admin')
  )
);

-- Admins can insert settings
create policy "Admins can insert tenant settings"
on public.tenant_settings for insert
with check (
  tenant_id = get_user_company(auth.uid())
  and (
    has_role(auth.uid(), tenant_id, 'admin')
    or has_role(auth.uid(), tenant_id, 'master_admin')
  )
);

-- Trigger for updated_at
create trigger update_tenant_settings_updated_at
  before update on public.tenant_settings
  for each row
  execute function public.update_updated_at_column();