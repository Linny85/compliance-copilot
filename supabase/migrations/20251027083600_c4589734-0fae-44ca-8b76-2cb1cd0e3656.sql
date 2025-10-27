-- Erweitere email_events Tabelle für Queue-Tracking
alter table public.email_events add column if not exists queue_id uuid;
alter table public.email_events add column if not exists event text;

-- Index für Queue-Lookups
create index if not exists idx_email_events_queue_id on public.email_events(queue_id) where queue_id is not null;