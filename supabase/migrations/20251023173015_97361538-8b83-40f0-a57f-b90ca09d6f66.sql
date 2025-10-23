-- Compliance summary view for aggregated metrics
create or replace view v_compliance_summary as
select
  r.tenant_id,
  count(*) filter (where r.outcome='pass') as passed,
  count(*) filter (where r.outcome='fail') as failed,
  count(*) filter (where r.outcome='warn') as warnings,
  count(*) as total,
  round(
    count(*) filter (where r.outcome='pass')::numeric / 
    nullif(count(*), 0) * 100, 
    2
  ) as success_rate,
  max(r.created_at) as last_run_at
from check_results r
group by r.tenant_id;

-- Performance index for compliance queries
create index if not exists check_results_tenant_created_idx 
  on check_results(tenant_id, created_at desc);

-- Create compliance-reports storage bucket
insert into storage.buckets (id, name, public)
values ('compliance-reports', 'compliance-reports', false)
on conflict (id) do nothing;

-- Storage policies for compliance-reports
drop policy if exists "compliance-reports-read" on storage.objects;
create policy "compliance-reports-read" on storage.objects
for select using (
  bucket_id = 'compliance-reports' and
  exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = auth.uid()
    where ur.user_id = auth.uid()
      and ur.company_id = p.company_id
      and ur.role in ('admin','master_admin')
      and name like p.company_id || '%'
  )
);

drop policy if exists "compliance-reports-write" on storage.objects;
create policy "compliance-reports-write" on storage.objects
for insert with check (
  bucket_id = 'compliance-reports' and
  exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = auth.uid()
    where ur.user_id = auth.uid()
      and ur.company_id = p.company_id
      and ur.role in ('admin','master_admin')
  )
);