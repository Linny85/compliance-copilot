create or replace function outbox_archive_prune(p_days int default 180)
returns bigint
language plpgsql
as $$
declare v_deleted bigint;
begin
  delete from integration_outbox_archive
  where created_at < now() - make_interval(days => p_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end
$$;