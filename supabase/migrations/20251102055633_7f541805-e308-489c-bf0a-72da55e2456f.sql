-- incidents table with RLS
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  impact text,
  status text not null default 'new',
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.incidents enable row level security;

-- Policies: users can insert and view their own incidents
create policy "incidents_insert_own"
  on public.incidents for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "incidents_select_own"
  on public.incidents for select
  to authenticated
  using (auth.uid() = created_by);