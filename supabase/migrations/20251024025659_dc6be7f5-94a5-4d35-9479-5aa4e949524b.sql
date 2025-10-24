-- Aggregation per Tenant (letzte X Stunden)
create or replace function deadjobs_by_tenant(since_ts timestamptz)
returns table(tenant_id uuid, cnt bigint)
language sql
stable
as $$
  select tenant_id, count(*)::bigint as cnt
  from integration_outbox
  where status = 'dead' and created_at >= since_ts
  group by tenant_id
  order by cnt desc
$$;

-- Top-Fehler global (letzte X Stunden)
create or replace function deadjobs_top_errors(since_ts timestamptz, top_n int default 5)
returns table(err text, cnt bigint)
language sql
stable
as $$
  select left(coalesce(last_error,''), 200) as err, count(*)::bigint as cnt
  from integration_outbox
  where status = 'dead' and created_at >= since_ts
  group by 1
  order by cnt desc
  limit greatest(top_n,1)
$$;