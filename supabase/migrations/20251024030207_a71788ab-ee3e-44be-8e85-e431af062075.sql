-- Performance indexes for retention queries
create index if not exists idx_outbox_status_created
  on integration_outbox (status, created_at);

-- Unique constraint for archive (if not already copied from LIKE)
create unique index if not exists integration_outbox_archive_pkey on integration_outbox_archive(id);