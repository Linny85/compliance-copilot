-- Add tenant license metadata and domain binding columns
alter table public."Unternehmen"
  add column if not exists license_tier text not null default 'trial',
  add column if not exists license_expires_at timestamptz,
  add column if not exists license_max_users integer,
  add column if not exists license_allowed_origins text[] not null default '{}',
  add column if not exists license_notes text;

-- Enforce allowed tier values
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'unternehmen_license_tier_check'
      and conrelid = 'public."Unternehmen"'::regclass
  ) then
    alter table public."Unternehmen"
      add constraint unternehmen_license_tier_check
      check (license_tier in ('trial', 'basic', 'pro', 'enterprise'));
  end if;
end
$$;
