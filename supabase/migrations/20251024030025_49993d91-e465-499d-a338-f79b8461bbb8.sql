-- 01_integration_outbox_archive.sql
create table if not exists integration_outbox_archive
  (like integration_outbox including all);

-- sinnvolle Indizes fürs Reporting
create index if not exists idx_outbox_archive_tenant on integration_outbox_archive(tenant_id);
create index if not exists idx_outbox_archive_status_created on integration_outbox_archive(status, created_at);
create index if not exists idx_outbox_archive_dedupe on integration_outbox_archive(dedupe_key);

-- (optional) RLS wie im Original – nur wenn ihr Archiv lesbar machen wollt
alter table integration_outbox_archive enable row level security;

drop policy if exists outbox_archive_select on integration_outbox_archive;
create policy outbox_archive_select on integration_outbox_archive
for select using (
  tenant_id = (select tenant_id from v_current_tenant)
);

-- 02_outbox_cleanup_function.sql
create or replace function outbox_cleanup(
  p_retention_days int default 30,
  p_batch_limit int default 5000
)
returns json
language plpgsql
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => p_retention_days);
  v_moved int := 0;
  v_deleted int := 0;
begin
  -- 1) In Archiv verschieben (nur delivered/dead, älter als cutoff), limitiert
  with candidates as (
    select id
    from integration_outbox
    where status in ('delivered','dead')
      and created_at < v_cutoff
    order by created_at
    limit p_batch_limit
  ),
  ins as (
    insert into integration_outbox_archive
    select o.*
    from integration_outbox o
    join candidates c on c.id = o.id
    on conflict (id) do nothing
    returning 1
  ),
  del as (
    delete from integration_outbox o
    using candidates c
    where o.id = c.id
    returning 1
  )
  select
    (select count(*) from ins),
    (select count(*) from del)
  into v_moved, v_deleted;

  return json_build_object(
    'cutoff', v_cutoff,
    'moved', v_moved,
    'deleted', v_deleted
  );
end;
$$;