-- Compatibility hotfix: Add generated user_id column to profiles
-- This prevents legacy code from breaking while we migrate to profiles.id

alter table public.profiles
  add column if not exists user_id uuid generated always as (id) stored;

-- Index for performance (if needed for filters)
create index if not exists idx_profiles_user_id on public.profiles(user_id);

comment on column public.profiles.user_id is 'Compatibility column: mirrors id. Use profiles.id in new code.';
