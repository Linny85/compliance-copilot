-- 1) Tabelle + Indizes
create extension if not exists pgcrypto;

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null,
  namespace text not null,
  tkey text not null,
  locale text not null,
  text text not null,
  version int not null default 1,
  approved boolean not null default false,
  approved_by uuid null,
  approved_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_by uuid null,
  updated_at timestamptz not null default now()
);

create unique index if not exists translations_uq
  on public.translations (coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), namespace, tkey, locale);

create index if not exists translations_ns_locale_idx on public.translations (namespace, locale);
create index if not exists translations_tenant_idx on public.translations (tenant_id);
create index if not exists translations_approved_idx on public.translations (approved);

-- updated_at Trigger
create or replace function public.set_updated_at_translations()
returns trigger language plpgsql as $$
begin 
  new.updated_at := now(); 
  return new; 
end;
$$;

drop trigger if exists trg_translations_updated_at on public.translations;
create trigger trg_translations_updated_at
before update on public.translations
for each row execute function public.set_updated_at_translations();

-- 2) RLS + Helpers
alter table public.translations enable row level security;

create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select nullif((current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::text,'')::uuid
$$;

create or replace function public.current_is_editor()
returns boolean language sql stable as $$
  select coalesce((current_setting('request.jwt.claims', true)::jsonb->>'is_editor')::boolean,false)
$$;

-- SELECT: auth users dürfen global ODER eigenen Tenant lesen
drop policy if exists tr_read on public.translations;
create policy tr_read on public.translations
  for select to authenticated
  using (tenant_id is null or tenant_id = public.current_tenant_id());

-- INSERT/UPDATE: nur Editor, nur eigener Tenant
drop policy if exists tr_insert on public.translations;
create policy tr_insert on public.translations
  for insert to authenticated
  with check (public.current_is_editor() and tenant_id = public.current_tenant_id());

drop policy if exists tr_update on public.translations;
create policy tr_update on public.translations
  for update to authenticated
  using (public.current_is_editor() and tenant_id = public.current_tenant_id())
  with check (public.current_is_editor() and tenant_id = public.current_tenant_id());

-- 3) Audit-Log
create table if not exists public.translations_history (
  id bigserial primary key,
  translation_id uuid not null,
  action text not null,
  snapshot jsonb not null,
  actor uuid null,
  occurred_at timestamptz not null default now()
);

create or replace function public.audit_translations()
returns trigger language plpgsql as $$
begin
  insert into public.translations_history(translation_id, action, snapshot, actor)
  values (coalesce(new.id, old.id), TG_OP::text, to_jsonb(coalesce(new, old)), null);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_translations_audit on public.translations;
create trigger trg_translations_audit
after insert or update or delete on public.translations
for each row execute function public.audit_translations();

-- 4) RPC: Lookup mit Fallback (Tenant -> Global -> Fallback-Locale)
create or replace function public.t_db(
  p_namespace text, 
  p_key text, 
  p_locale text, 
  p_fallback text default 'en'
) returns text language sql stable as $$
  with cand as (
    select text from public.translations
      where namespace=p_namespace and tkey=p_key and locale=p_locale
        and tenant_id = public.current_tenant_id() and approved=true
    union all
    select text from public.translations
      where namespace=p_namespace and tkey=p_key and locale=p_locale
        and tenant_id is null and approved=true
    union all
    select text from public.translations
      where namespace=p_namespace and tkey=p_key and locale=p_fallback
        and tenant_id is null and approved=true
  )
  select coalesce((select text from cand limit 1), p_key);
$$;

-- 5) Seed: Erste Test-Einträge
insert into public.translations (tenant_id, namespace, tkey, locale, text, approved)
values
  (null, 'controls','catalog.AI_ACT.AI-01.title','de','AI-01 – Verantwortlichkeiten & Schulung', true),
  (null, 'controls','catalog.AI_ACT.AI-01.title','en','AI-01 – Responsibilities & Training', true),
  (null, 'controls','catalog.AI_ACT.AI-01.title','sv','AI-01 – Ansvar & Utbildning', true)
on conflict (coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), namespace, tkey, locale) 
do nothing;