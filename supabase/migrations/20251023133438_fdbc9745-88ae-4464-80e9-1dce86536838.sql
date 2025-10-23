-- Create app_role enum (with proper syntax)
do $$ begin
  create type public.app_role as enum ('master_admin', 'admin', 'editor', 'member');
exception
  when duplicate_object then null;
end $$;

-- Create user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  company_id uuid not null,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (user_id, company_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _company_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and company_id = _company_id
      and role = _role
  )
$$;

-- Create security definer function to get user company
create or replace function public.get_user_company(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = 'public'
as $$
  select company_id
  from public.profiles
  where id = _user_id
  limit 1
$$;

-- RLS Policies for user_roles
do $$ begin
  create policy "Users can view roles in their company"
  on public.user_roles
  for select
  using (company_id = get_user_company(auth.uid()));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "Master admins can manage roles"
  on public.user_roles
  for all
  using (has_role(auth.uid(), company_id, 'master_admin'));
exception
  when duplicate_object then null;
end $$;

-- Migrate existing data from profiles.role to user_roles
insert into public.user_roles (user_id, company_id, role)
select p.id, p.company_id, p.role::app_role
from public.profiles p
where p.company_id is not null
  and p.role is not null
  and not exists (
    select 1 from public.user_roles ur 
    where ur.user_id = p.id and ur.company_id = p.company_id
  );

-- Drop role column from profiles
alter table public.profiles drop column if exists role;

-- Create index for user_roles
create index if not exists user_roles_user_company_idx on public.user_roles (user_id, company_id);