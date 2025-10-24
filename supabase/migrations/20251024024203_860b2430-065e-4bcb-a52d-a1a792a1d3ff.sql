-- v_current_tenant View für sauberere RLS
create or replace view v_current_tenant as
select p.id as user_id, p.company_id as tenant_id
from profiles p
where p.id = auth.uid();

-- JSON-Feature-Flags in tenant_settings (falls settings noch nicht existiert)
alter table tenant_settings
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Helper-Funktion: JSON-Flag mit Column-Fallback
create or replace function feature_enabled(_tenant uuid, _path text[], _fallback boolean default false)
returns boolean language sql stable as $$
  select coalesce(
    (select (tenant_settings.settings #>> _path)::boolean from tenant_settings where tenant_id=_tenant),
    case
      when array_to_string(_path,'/') = 'features/integrations/slack' then
        (select ts.integration_slack_enabled from tenant_settings ts where ts.tenant_id=_tenant)
      when array_to_string(_path,'/') = 'features/integrations/jira' then
        (select ts.integration_jira_enabled from tenant_settings ts where ts.tenant_id=_tenant)
      when array_to_string(_path,'/') = 'features/approval_required_for_untrusted' then
        (select ts.approval_required_for_untrusted from tenant_settings ts where ts.tenant_id=_tenant)
      else _fallback
    end
  , _fallback);
$$;

-- Default-Flags setzen/mergen
create or replace function set_default_flags(_tenant uuid)
returns void language plpgsql as $$
begin
  insert into tenant_settings(tenant_id, settings)
  values (_tenant, jsonb_build_object(
    'features', jsonb_build_object(
      'integrations', jsonb_build_object('slack', false, 'jira', false),
      'approval_required_for_untrusted', true
    )
  ))
  on conflict (tenant_id) do update
    set settings = tenant_settings.settings || excluded.settings,
        updated_at = now();
end $$;

-- Idempotentes Enqueue mit Dedupe-Key
create or replace function enqueue_integration_event(
  _tenant uuid,
  _channel text,
  _event_type text,
  _payload jsonb,
  _dedupe_key text default null
) returns uuid
language plpgsql as $$
declare _id uuid;
begin
  insert into integration_outbox(tenant_id, channel, event_type, payload, dedupe_key)
  values (_tenant, _channel, _event_type, _payload, _dedupe_key)
  on conflict (dedupe_key) where _dedupe_key is not null
  do update set
    next_attempt_at = least(integration_outbox.next_attempt_at, now()),
    status = case when integration_outbox.status = 'dead' then 'pending' else integration_outbox.status end,
    last_error = null
  returning id into _id;
  return _id;
end $$;