-- Analytics Views für E-Mail KPIs

-- A) Normalisierte Eventtypen
create or replace view public.v_email_events_norm as
select
  e.id,
  e.queue_id,
  case
    when e.event in ('queued','sending','sent','failed','delivered') then e.event
    when e.event = 'webhook:delivered' then 'delivered'
    when e.event = 'webhook:open' then 'open'
    when e.event = 'webhook:click' then 'click'
    when e.event = 'webhook:bounce' then 'bounce'
    when e.event = 'webhook:spam' then 'spam'
    when e.event_type is not null then e.event_type
    else 'other'
  end as event_type,
  e.occurred_at as created_at,
  e.payload as meta
from public.email_events e;

-- B) Letzter Status pro Queue
create or replace view public.v_email_last_status as
select
  q.id as queue_id,
  q.template_code,
  q.to_email,
  q.created_at as queued_at,
  q.sent_at,
  q.attempts,
  q.status as queue_status,
  bool_or(ev.event_type = 'delivered') as was_delivered,
  bool_or(ev.event_type = 'open') as was_opened,
  bool_or(ev.event_type = 'click') as was_clicked,
  bool_or(ev.event_type = 'bounce') as was_bounced,
  max(case when ev.event_type in ('delivered','open','click','bounce') then ev.created_at end) as last_event_at
from public.email_queue q
left join public.v_email_events_norm ev on ev.queue_id = q.id
group by q.id, q.template_code, q.to_email, q.created_at, q.sent_at, q.attempts, q.status;

-- C) Template-Stats (Rolling 30 Tage)
create or replace view public.v_email_stats as
with base as (
  select *
  from public.v_email_last_status
  where queued_at >= now() - interval '30 days'
)
select
  template_code,
  count(*) as total_enqueued,
  count(*) filter (where queue_status = 'sent') as total_sent,
  count(*) filter (where was_delivered) as delivered,
  count(*) filter (where was_opened) as opened,
  count(*) filter (where was_clicked) as clicked,
  count(*) filter (where was_bounced) as bounced,
  round(100.0 * count(*) filter (where was_delivered) / nullif(count(*),0), 1) as delivery_rate_pct,
  round(100.0 * count(*) filter (where was_opened) / nullif(count(*),0), 1) as open_rate_pct,
  round(100.0 * count(*) filter (where was_clicked) / nullif(count(*),0), 1) as click_rate_pct,
  round(100.0 * count(*) filter (where was_bounced) / nullif(count(*),0), 1) as bounce_rate_pct,
  max(last_event_at) as last_activity_at
from base
group by template_code
order by total_enqueued desc;