-- 1) Tabelle anlegen (idempotent)
create table if not exists public.security_audits (
  id uuid primary key default gen_random_uuid(),
  performed_at timestamptz not null,
  performed_by text not null,
  audit_type text not null check (audit_type in ('PenTest','Internal','External','Compliance')),
  summary text,
  created_at timestamptz not null default now()
);

-- 2) RLS aktivieren (idempotent)
alter table public.security_audits enable row level security;

-- 3) Lesepolicy für angemeldete Nutzer (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'security_audits'
      and policyname = 'Allow authenticated read audits'
  ) then
    create policy "Allow authenticated read audits"
      on public.security_audits
      for select
      to authenticated
      using (true);
  end if;
end$$;

-- 4) Beispieldaten einfügen (einmalig)
insert into public.security_audits (performed_at, performed_by, audit_type, summary)
values ('2025-04-12 10:00:00+02', 'SecureLabs Schweden', 'External', 'Externer Penetrationstest und Code-Audit')
on conflict do nothing;