# Cleanup Plan: profiles.user_id Compatibility Column

## Context

A `user_id` column was temporarily added to the `profiles` table as a generated compatibility column to prevent breaking changes during migration. This column mirrors the `id` column.

```sql
-- Compatibility column (TEMPORARY)
alter table public.profiles
  add column if not exists user_id uuid generated always as (id) stored;
```

## Cleanup Steps

Once all deployments are verified and no code uses `profiles.user_id`:

### 1. Pre-Cleanup Verification

Check for any remaining dependencies on `user_id`:

```sql
-- Find server-side dependencies (views/functions)
select 
  d.objid::regclass as dependent_object,
  c.relname as referenced_table,
  a.attname as referenced_column
from pg_depend d
join pg_attribute a on a.attrelid = d.refobjid and a.attnum = d.refobjsubid
join pg_class c on c.oid = a.attrelid
where a.attrelid = 'public.profiles'::regclass
  and a.attname = 'user_id';
```

### 2. Remove Compatibility Column

```sql
-- Remove index
drop index if exists public.idx_profiles_user_id;

-- Remove generated column
alter table public.profiles drop column if exists user_id;
```

### 3. Verify Cleanup

```sql
-- Confirm column is removed
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

-- Expected: only 'id' column exists, no 'user_id'
```

## Protection Against Regression

- Pre-commit hook blocks `profiles.user_id` usage
- CI workflow scans for forbidden patterns
- Codemod available: `npm run guard:fix`

## Timeline

- ✅ Migration applied (compatibility column added)
- ✅ Code updated to use `profiles.id`
- ✅ Guards implemented (pre-commit, CI)
- 🔄 Verify all deployments (wait 1-2 weeks)
- ⏳ Remove compatibility column (follow steps above)

## Rollback Plan

If issues arise after removal:

```sql
-- Re-add compatibility column
alter table public.profiles
  add column user_id uuid generated always as (id) stored;

create index idx_profiles_user_id on public.profiles(user_id);
```
