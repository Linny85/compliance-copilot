-- EN & SV Starter-Inhalte für alle Module
insert into public.helpbot_knowledge (module, locale, title, content) values
-- EN
('dashboard','en','Overview','The dashboard shows status, open tasks, and NIS2/AI Act compliance hints. Start your daily checks and review risks at a glance.'),
('checks','en','Rule checks','Define and run automated policy checks. Results appear with status, severity, and recommended actions.'),
('controls','en','Control catalog','Manage measures (e.g., access, backup, incident response) and link them to evidence.'),
('documents','en','Document management','Store policies, processes, DPIAs, training docs. Versioned, searchable, with approvals.'),
('evidence','en','Evidence','Collect logs, reports, and screenshots as audit evidence and link them to controls.'),
('training','en','Training','Plan, deliver, and document trainings. Certificates are QR-verifiable.'),
('admin','en','Admin','Users, roles/RBAC, tenants, integrations (e.g., Postmark/Stripe).'),
('billing','en','Billing','Plans, licenses, invoices. Admins only.'),

-- SV
('dashboard','sv','Översikt','Instrumentpanelen visar status, öppna uppgifter och tips för NIS2/AI Act. Starta dagliga kontroller och se risker direkt.'),
('checks','sv','Regelkontroller','Definiera och kör automatiska kontroller. Resultat visas med status, allvarlighetsgrad och åtgärdsförslag.'),
('controls','sv','Kontrollkatalog','Hantera åtgärder (t.ex. åtkomst, backup, incidentrespons) och koppla dem till bevis.'),
('documents','sv','Dokumenthantering','Policys, processer, DPIA och utbildningsmaterial. Versionshantering, sökbart, godkännanden.'),
('evidence','sv','Bevis','Samla loggar, rapporter och skärmdumpar som revisionsbevis och länka dem till kontroller.'),
('training','sv','Utbildning','Planera, genomför och dokumentera utbildningar. Certifikat är QR-verifierbara.'),
('admin','sv','Admin','Användare, roller/RBAC, klienter, integrationer (t.ex. Postmark/Stripe).'),
('billing','sv','Fakturering','Planer, licenser, fakturor. Endast för administratörer.')
on conflict (module, locale, title) do nothing;

-- Feedback-Tabelle
create table if not exists public.helpbot_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text,
  question text not null,
  answer_id text,
  helpful boolean,
  notes text
);

alter table public.helpbot_feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='helpbot_feedback'
      and policyname='helpbot_feedback_read_any'
  ) then
    create policy helpbot_feedback_read_any
      on public.helpbot_feedback for select
      using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='helpbot_feedback'
      and policyname='helpbot_feedback_insert_any'
  ) then
    create policy helpbot_feedback_insert_any
      on public.helpbot_feedback for insert
      with check (true);
  end if;
end$$;

-- Intents/Synonyme
create table if not exists public.helpbot_synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  module text not null
);

alter table public.helpbot_synonyms enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='helpbot_synonyms'
      and policyname='helpbot_synonyms_read_any'
  ) then
    create policy helpbot_synonyms_read_any
      on public.helpbot_synonyms for select
      using (true);
  end if;
end$$;

-- Beispiel-Synonyme
insert into public.helpbot_synonyms (term, module) values
('policy-prüfung','checks'),
('regeltest','checks'),
('maßnahmen','controls'),
('richtlinien','documents'),
('nachweise','evidence'),
('belege','evidence'),
('schulung','training'),
('kurs','training'),
('zertifikat','training')
on conflict do nothing;