-- Phase 7B-9 Final: RLS Policies & Security Hardening

-- 1) tenant_settings RLS (already enabled, now add proper policies)
drop policy if exists "Users can view their tenant settings" on public.tenant_settings;
drop policy if exists "Admins can update tenant settings" on public.tenant_settings;
drop policy if exists "Admins can insert tenant settings" on public.tenant_settings;

create policy "Admins can read tenant settings"
on public.tenant_settings for select
using (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.tenant_settings.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
);

create policy "Admins can insert tenant settings"
on public.tenant_settings for insert
with check (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.tenant_settings.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
);

create policy "Admins can update tenant settings"
on public.tenant_settings for update
using (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.tenant_settings.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.tenant_settings.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
);

-- 2) notification_deliveries RLS (drop old, add proper)
drop policy if exists "Service role can manage deliveries" on public.notification_deliveries;
drop policy if exists "Tenants can read their own deliveries" on public.notification_deliveries;

create policy "Admins can read deliveries"
on public.notification_deliveries for select
using (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.notification_deliveries.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
);

-- Service role bypasses RLS; explicitly revoke direct insert from users
revoke insert, update, delete on public.notification_deliveries from anon, authenticated;

-- 3) run_events_queue RLS (drop old, add proper)
drop policy if exists "Service role can manage all events" on public.run_events_queue;
drop policy if exists "Tenants can read their own events" on public.run_events_queue;

create policy "Admins can read queue"
on public.run_events_queue for select
using (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.run_events_queue.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
);

create policy "Admins can insert test events"
on public.run_events_queue for insert
with check (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.run_events_queue.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
);

-- Service role bypasses RLS for updates/deletes; explicitly revoke from users
revoke update, delete on public.run_events_queue from anon, authenticated;

-- 4) run_events_deadletter RLS (drop old, add proper)
drop policy if exists "Service role can manage deadletter" on public.run_events_deadletter;
drop policy if exists "Tenants can read their own deadletter" on public.run_events_deadletter;

create policy "Admins can read deadletter"
on public.run_events_deadletter for select
using (
  exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.company_id = public.run_events_deadletter.tenant_id
    where p.id = auth.uid() and ur.role in ('admin','master_admin')
  )
);

-- Service role only for inserts; revoke from users
revoke insert, update, delete on public.run_events_deadletter from anon, authenticated;