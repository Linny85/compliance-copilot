-- Update ops_metrics with tenant-scope (Variante A)
create or replace function ops_metrics(p_lookback_hours int default 24)
returns json
language plpgsql stable
as $$
declare
  v_tenant uuid := (select tenant_id from v_current_tenant);
  v_since_24h timestamptz := now() - make_interval(hours => p_lookback_hours);
  v_since_7d  timestamptz := now() - interval '7 days';
  v_pending bigint := 0;
  v_dead24 bigint := 0;
  v_delivered24 bigint := 0;
  v_avg_attempts7 numeric := 0;
  v_top_errors jsonb := '[]'::jsonb;
begin
  select count(*) into v_pending
    from integration_outbox where tenant_id=v_tenant and status='pending';

  select count(*) into v_dead24
    from integration_outbox where tenant_id=v_tenant and status='dead' and created_at>=v_since_24h;

  select count(*) into v_delivered24
    from integration_outbox where tenant_id=v_tenant and status='delivered' and delivered_at>=v_since_24h;

  select coalesce(avg(attempts)::numeric(10,2),0) into v_avg_attempts7
    from integration_outbox where tenant_id=v_tenant and status='delivered' and delivered_at>=v_since_7d;

  select coalesce(jsonb_agg(jsonb_build_object('error', left(coalesce(last_error,''),160), 'cnt', cnt) order by cnt desc), '[]'::jsonb)
    into v_top_errors
  from (
    select left(coalesce(last_error,''),160) as last_error, count(*)::bigint as cnt
    from integration_outbox
    where tenant_id=v_tenant and status='dead' and created_at>=v_since_24h
    group by 1
    order by cnt desc
    limit 5
  ) t;

  return json_build_object(
    'pending', v_pending,
    'dead24h', v_dead24,
    'delivered24h', v_delivered24,
    'avgAttempts7d', v_avg_attempts7,
    'topErrors24h', v_top_errors
  );
end $$;

-- Performance-Index für Multi-Tenant
create index if not exists idx_outbox_tenant_status_created
  on integration_outbox(tenant_id, status, created_at);