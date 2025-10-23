-- Update RLS policies for qa_monitor: remove client UPDATE, only service role can write
drop policy if exists qa_monitor_write on public.qa_monitor;
drop policy if exists qa_monitor_insert on public.qa_monitor;

-- Only allow SELECT for admins (no client-side updates)
-- Service role bypasses RLS and can perform INSERT/UPDATE

-- Add indexes for performance
create index if not exists notification_deliveries_tenant_created_idx 
  on public.notification_deliveries(tenant_id, created_at desc);

create index if not exists qa_results_tenant_started_idx 
  on public.qa_results(tenant_id, started_at desc);

-- Backfill qa_monitor for all existing tenants without entries
insert into public.qa_monitor (tenant_id, last_run_at, avg_latency_ms, failed_24h)
select p.company_id, now(), 0, 0
from public.profiles p
where p.company_id is not null
  and not exists (
    select 1 from public.qa_monitor m where m.tenant_id = p.company_id
  )
group by p.company_id;