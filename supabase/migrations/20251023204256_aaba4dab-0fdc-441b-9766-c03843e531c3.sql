-- Task A: Integration Outbox & DLQ for reliable Slack/Jira dispatches

create table if not exists integration_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  channel text not null check (channel in ('slack','jira','webhook')),
  event_type text not null,
  payload jsonb not null,
  dedupe_key text,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','delivered','failed','dead')),
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index idx_integration_outbox_status_next on integration_outbox (status, next_attempt_at);
create index idx_integration_outbox_tenant on integration_outbox (tenant_id);
create unique index idx_integration_outbox_dedupe on integration_outbox(dedupe_key) where dedupe_key is not null;

create table if not exists integration_dlq (
  id uuid primary key,
  tenant_id uuid not null,
  channel text not null,
  event_type text not null,
  payload jsonb not null,
  dedupe_key text,
  attempts int not null,
  last_error text,
  created_at timestamptz not null,
  failed_at timestamptz not null default now()
);

alter table integration_outbox enable row level security;
alter table integration_dlq enable row level security;

create policy "outbox_tenant_read" on integration_outbox
  for select using (tenant_id = get_user_company(auth.uid()));

create policy "outbox_service_write" on integration_outbox
  for insert with check (
    exists(select 1 from user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = integration_outbox.tenant_id
        and ur.role in ('admin','master_admin'))
  );

create policy "dlq_tenant_read" on integration_dlq
  for select using (tenant_id = get_user_company(auth.uid()));

-- Task B: Approvals for untrusted actions

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references "Unternehmen"(id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  action text not null,
  requested_by uuid not null references auth.users(id),
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  expires_at timestamptz default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create index idx_approvals_tenant_status on approvals (tenant_id, status, created_at desc);
create index idx_approvals_requested_by on approvals (requested_by);

alter table approvals enable row level security;

create policy "approvals_tenant_read" on approvals
  for select using (
    tenant_id = get_user_company(auth.uid())
  );

create policy "approvals_create" on approvals
  for insert with check (
    tenant_id = get_user_company(auth.uid())
    and requested_by = auth.uid()
  );

create policy "approvals_admin_update" on approvals
  for update using (
    has_role(auth.uid(), tenant_id, 'admin'::app_role)
    or has_role(auth.uid(), tenant_id, 'master_admin'::app_role)
  );

-- Extend tenant_settings for feature flags

alter table tenant_settings
  add column if not exists integration_slack_enabled boolean default false,
  add column if not exists integration_slack_webhook_url text,
  add column if not exists integration_jira_enabled boolean default false,
  add column if not exists integration_jira_base_url text,
  add column if not exists integration_jira_project_key text,
  add column if not exists approval_required_for_untrusted boolean default true;

-- Views for monitoring

create or replace view v_integration_pending as
select *
from integration_outbox
where status = 'pending'
  and next_attempt_at <= now()
order by next_attempt_at
limit 100;

create or replace view v_approvals_pending as
select a.*,
       p.full_name as requester_name,
       p.email as requester_email
from approvals a
join profiles p on p.id = a.requested_by
where a.status = 'pending'
  and (a.expires_at is null or a.expires_at > now())
order by a.created_at desc;