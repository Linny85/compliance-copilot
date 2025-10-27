-- ===========================================
-- DEMO SEEDING: Tenant + Email Queue + Events + Analysen
-- Ziel: realistische Demo-Daten für UI & KPIs
-- Voraussetzungen: Phase 7 Schema & Funktionen sind deployed
-- ===========================================

-- 0) Extensions (id, json helpers)
create extension if not exists pgcrypto;

-- 1) Demo-Tenant anlegen/holen
insert into public."Unternehmen" (id, name, created_at)
values ('00000000-0000-0000-0000-000000000000'::uuid, 'Demo Company SE', now() - interval '60 days')
on conflict (id) do update set name = excluded.name;

-- 2) Cleanup alter Demo-Daten (idempotent)
delete from public.email_events  where queue_id in (select id from public.email_queue where tenant_id = '00000000-0000-0000-0000-000000000000'::uuid);
delete from public.email_queue   where tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Optional: Analysen-Tables bereinigen (falls vorhanden)
delete from public.ti        where tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
delete from public.nis2      where tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
delete from public.ai        where tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
delete from public.ai_role   where tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 3) Templates sicherstellen (falls noch nicht vorhanden)
insert into public.email_templates (code, subject, template_html, postmark_template_id)
values
  ('ai_act_training_reminder','AI Act Training – Erinnerung',
   '<html><body><h2>Hallo {{name}},</h2><p>AI-Act-Training Reminder.</p><p>Tenant: {{tenant_name}}</p><p><a href="{{cta_url}}">Start</a></p></body></html>', null),
  ('nis2_welcome_next_steps','Willkommen – NIS2 Quickstart für {{tenant_name}}',
   '<html><body><h2>Willkommen, {{contact_name}}!</h2><p>NIS2 Quickstart.</p><p><a href="{{dashboard_url}}">Zum Dashboard</a></p></body></html>', null)
on conflict (code) do nothing;

-- 4) Analysen (je 3 Einträge) – realistische Zeitachsen (falls Tabellen existieren)
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'ti') then
    with t as (select '00000000-0000-0000-0000-000000000000'::uuid as tenant_id)
    insert into public.ti (tenant_id, created_at, updated_at)
    select tenant_id, now()-make_interval(days=>d), now()-make_interval(days=>d)
    from t, (values (0),(7),(21)) v(d);
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'nis2') then
    with t as (select '00000000-0000-0000-0000-000000000000'::uuid as tenant_id)
    insert into public.nis2 (tenant_id, created_at, updated_at)
    select tenant_id, now()-make_interval(days=>d), now()-make_interval(days=>d)
    from t, (values (0),(10),(28)) v(d);
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'ai') then
    with t as (select '00000000-0000-0000-0000-000000000000'::uuid as tenant_id)
    insert into public.ai (tenant_id, created_at, updated_at)
    select tenant_id, now()-make_interval(days=>d), now()-make_interval(days=>d)
    from t, (values (0),(3),(14)) v(d);
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'ai_role') then
    with t as (select '00000000-0000-0000-0000-000000000000'::uuid as tenant_id)
    insert into public.ai_role (tenant_id, created_at, updated_at)
    select tenant_id, now()-make_interval(days=>d), now()-make_interval(days=>d)
    from t, (values (0),(2),(5)) v(d);
  end if;
end $$;

-- 5) Email Queue – Mix aus sent/failed/cancelled/queued (12 Einträge)
with tenant as (select '00000000-0000-0000-0000-000000000000'::uuid as tenant_id)
insert into public.email_queue (id, tenant_id, to_email, to_name, template_code, model, status, retry_count, scheduled_at, sent_at, created_at)
values
  -- SENT (5)
  (gen_random_uuid(), (select tenant_id from tenant), 'linda@example.com','Linda','ai_act_training_reminder',
    jsonb_build_object('name','Linda','tenant_name','Demo Company SE','cta_url','https://demo.example.com/training'), 'sent', 1, null, now()-interval '2 days', now()-interval '2 days'),
  (gen_random_uuid(), (select tenant_id from tenant), 'max@example.com','Max','ai_act_training_reminder',
    jsonb_build_object('name','Max','tenant_name','Demo Company SE','cta_url','https://demo.example.com/training'), 'sent', 1, null, now()-interval '1 days', now()-interval '1 days'),
  (gen_random_uuid(), (select tenant_id from tenant), 'nora@example.com','Nora','nis2_welcome_next_steps',
    jsonb_build_object('contact_name','Nora','tenant_name','Demo Company SE','dashboard_url','https://demo.example.com/nis2'), 'sent', 1, null, now()-interval '5 days', now()-interval '5 days'),
  (gen_random_uuid(), (select tenant_id from tenant), 'sam@example.com','Sam','ai_act_training_reminder',
    jsonb_build_object('name','Sam','tenant_name','Demo Company SE','cta_url','https://demo.example.com/training'), 'sent', 1, null, now()-interval '8 days', now()-interval '8 days'),
  (gen_random_uuid(), (select tenant_id from tenant), 'tina@example.com','Tina','nis2_welcome_next_steps',
    jsonb_build_object('contact_name','Tina','tenant_name','Demo Company SE','dashboard_url','https://demo.example.com/nis2'), 'sent', 1, null, now()-interval '15 days', now()-interval '15 days'),

  -- FAILED (2) – mit Backoff-Slots in der Zukunft
  (gen_random_uuid(), (select tenant_id from tenant), 'fail1@example.com','Fail One','ai_act_training_reminder',
    jsonb_build_object('name','Fail One','tenant_name','Demo Company SE','cta_url','#'), 'failed', 2, now()+interval '4 minutes', null, now()-interval '1 minutes'),
  (gen_random_uuid(), (select tenant_id from tenant), 'fail2@example.com','Fail Two','nis2_welcome_next_steps',
    jsonb_build_object('contact_name','Fail Two','tenant_name','Demo Company SE','dashboard_url','#'), 'failed', 3, now()+interval '9 minutes', null, now()-interval '2 minutes'),

  -- CANCELLED (2) – nach 5 Attempts
  (gen_random_uuid(), (select tenant_id from tenant), 'old1@example.com','Old One','ai_act_training_reminder',
    jsonb_build_object('name','Old One','tenant_name','Demo Company SE','cta_url','#'), 'cancelled', 5, null, null, now()-interval '20 days'),
  (gen_random_uuid(), (select tenant_id from tenant), 'old2@example.com','Old Two','nis2_welcome_next_steps',
    jsonb_build_object('contact_name','Old Two','tenant_name','Demo Company SE','dashboard_url','#'), 'cancelled', 6, null, null, now()-interval '40 days'),

  -- QUEUED (3) – sofort versandbereit
  (gen_random_uuid(), (select tenant_id from tenant), 'queued1@example.com','Queued One','ai_act_training_reminder',
    jsonb_build_object('name','Queued One','tenant_name','Demo Company SE','cta_url','https://demo.example.com/training'), 'queued', 0, null, null, now()),
  (gen_random_uuid(), (select tenant_id from tenant), 'queued2@example.com','Queued Two','nis2_welcome_next_steps',
    jsonb_build_object('contact_name','Queued Two','tenant_name','Demo Company SE','dashboard_url','https://demo.example.com/nis2'), 'queued', 0, null, null, now()),
  (gen_random_uuid(), (select tenant_id from tenant), 'queued3@example.com','Queued Three','ai_act_training_reminder',
    jsonb_build_object('name','Queued Three','tenant_name','Demo Company SE','cta_url','https://demo.example.com/training'), 'queued', 0, null, null, now());

-- 6) Events erzeugen: queued → sending → sent/delivered, opens/clicks
with last_sent as (
  select id from public.email_queue
  where tenant_id='00000000-0000-0000-0000-000000000000'::uuid and status='sent'
  order by created_at desc limit 3
),
last_failed as (
  select id from public.email_queue
  where tenant_id='00000000-0000-0000-0000-000000000000'::uuid and status='failed'
  order by created_at desc limit 2
),
last_queued as (
  select id from public.email_queue
  where tenant_id='00000000-0000-0000-0000-000000000000'::uuid and status='queued'
  order by created_at asc limit 2
)
insert into public.email_events (queue_id, event_type, email, payload)
-- Sent flow
select id, 'queued', 'linda@example.com', '{}'::jsonb from last_sent union all
select id, 'sending', 'linda@example.com', '{}'::jsonb from last_sent union all
select id, 'sent', 'linda@example.com', '{}'::jsonb from last_sent union all
select id, 'delivered', 'linda@example.com', '{}'::jsonb from last_sent union all
select id, 'open', 'linda@example.com', '{}'::jsonb from last_sent union all
select id, 'click', 'linda@example.com', '{}'::jsonb from last_sent
union all
-- Failed flow
select id, 'queued', 'fail1@example.com', '{}' from last_failed union all
select id, 'sending', 'fail1@example.com', '{}' from last_failed union all
select id, 'failed', 'fail1@example.com', '{}'  from last_failed
union all
-- Queued flow (nur queued)
select id, 'queued', 'queued1@example.com', '{}' from last_queued;
