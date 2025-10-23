-- Fix search_path security warning for trigger function
create or replace function public.trg_enqueue_run_event()
returns trigger 
language plpgsql 
security definer 
set search_path = public
as $$
begin
  -- Only fire when status changes or finished_at is set
  if TG_OP = 'UPDATE' and (
    new.status is distinct from old.status 
    or (new.finished_at is not null and old.finished_at is null)
  ) then
    insert into public.run_events_queue (
      tenant_id, run_id, status, rule_code, started_at, finished_at
    )
    select 
      new.tenant_id, 
      new.id, 
      new.status, 
      r.code, 
      new.started_at, 
      new.finished_at
    from public.check_rules r
    where r.id = new.rule_id 
      and r.deleted_at is null;
  end if;
  return new;
end;
$$;