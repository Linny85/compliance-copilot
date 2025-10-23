-- Add role column to profiles for authorization
alter table profiles add column if not exists role text not null default 'member';

-- Create index for role lookups
create index if not exists idx_profiles_role on profiles(role);