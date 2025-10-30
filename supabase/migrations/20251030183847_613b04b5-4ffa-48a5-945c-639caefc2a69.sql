-- Create dummy views to prevent 404 errors on unused features
-- These return empty but valid result sets

create or replace view ops_dashboard as
select null::uuid as tenant_id, 'N/A'::text as status;

create or replace view insight_history as
select null::uuid as tenant_id, now() as generated_at, 0::numeric as success_rate;

create or replace view alert_history as
select null::uuid as tenant_id, now() as triggered_at, 'No alerts yet'::text as message;