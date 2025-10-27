-- Drop und recreate v_email_next mit korrekten Spalten
drop view if exists public.v_email_next;

create view public.v_email_next as
select 
  id,
  tenant_id,
  to_email,
  to_name,
  template_code,
  payload,
  attempts
from public.email_queue
where status = 'queued'
  and (scheduled_at is null or scheduled_at <= now())
  and attempts < 5
order by created_at
limit 50;