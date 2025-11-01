-- Create org_secrets table for master passwords

create table if not exists public.org_secrets (
  tenant_id uuid primary key,
  master_hash text not null,
  algo text not null default 'argon2id',
  version int not null default 1,
  rotated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.org_secrets enable row level security;

create policy org_secrets_no_direct_access on public.org_secrets
  for all to authenticated
  using (false);