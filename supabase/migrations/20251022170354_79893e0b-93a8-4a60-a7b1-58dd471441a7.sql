-- Rename companies table to Unternehmen
alter table companies rename to "Unternehmen";

-- Rename created_by column to erstellt_von
alter table "Unternehmen" rename column created_by to erstellt_von;

-- Enable RLS on Unternehmen table
alter table "Unternehmen" enable row level security;

-- Drop existing policies if they exist
drop policy if exists companies_insert_onboarding on "Unternehmen";
drop policy if exists companies_select_owner on "Unternehmen";
drop policy if exists unternehmen_insert_policy on "Unternehmen";
drop policy if exists unternehmen_select_policy on "Unternehmen";

-- Create INSERT policy: users can only insert companies they created
create policy unternehmen_insert_policy
  on "Unternehmen"
  for insert
  to authenticated
  with check (erstellt_von = auth.uid());

-- Create SELECT policy: users can only view companies they created
create policy unternehmen_select_policy
  on "Unternehmen"
  for select
  to authenticated
  using (erstellt_von = auth.uid());

-- Create unique index to ensure one company per user
create unique index if not exists uniq_unternehmen_erstellt_von on "Unternehmen"(erstellt_von);