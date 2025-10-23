-- Storage policies for qa-reports bucket
-- Only admins can read reports for their tenant
drop policy if exists "qa-reports-read" on storage.objects;
create policy "qa-reports-read" on storage.objects
for select using (
  bucket_id = 'qa-reports' and
  exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = auth.uid()
    where ur.user_id = auth.uid()
      and ur.company_id = p.company_id
      and ur.role in ('admin','master_admin')
      and name like p.company_id || '%'
  )
);

-- Service role can write (bypasses RLS)
drop policy if exists "qa-reports-write" on storage.objects;
create policy "qa-reports-write" on storage.objects
for insert with check (
  bucket_id = 'qa-reports' and
  exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = auth.uid()
    where ur.user_id = auth.uid()
      and ur.company_id = p.company_id
      and ur.role in ('admin','master_admin')
  )
);