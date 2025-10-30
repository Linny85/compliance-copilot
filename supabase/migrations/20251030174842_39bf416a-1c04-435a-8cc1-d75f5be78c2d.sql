-- 1) Knowledge-Tabelle für den Bot
create table if not exists public.helpbot_knowledge (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  locale text not null default 'de',
  title text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_helpbot_knowledge_unique
  on public.helpbot_knowledge(module, locale, title);

-- 2) RLS + öffentliche Lese-Policy
alter table public.helpbot_knowledge enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='helpbot_knowledge'
      and policyname='helpbot_read_any'
  ) then
    create policy helpbot_read_any
      on public.helpbot_knowledge
      for select
      using (true);
  end if;
end$$;

-- 3) Start-Inhalte (DE)
insert into public.helpbot_knowledge (module, locale, title, content)
values
  ('dashboard','de','Überblick',
   'Das Dashboard zeigt Status, offene Aufgaben und Hinweise zur NIS2/AI Act Compliance. Hier startest du tägliche Checks und siehst Risiken auf einen Blick.'),
  ('checks','de','Regel-Checks',
   'Im Modul "Checks" definierst und prüfst automatisierte Regeln (Policies). Ergebnisse erscheinen als Befunde mit Status, Schweregrad und Handlungsempfehlung.'),
  ('controls','de','Kontrollkatalog',
   'Im Modul "Controls" verwaltest du Maßnahmen (z. B. Zugriff, Backup, Incident-Response) und verknüpfst sie mit Nachweisen.'),
  ('documents','de','Dokumenten-Management',
   'Im Modul "Documents" liegen Richtlinien, Prozesse, DPIA/DSR, Schulungsunterlagen. Versioniert, suchbar, mit Freigaben.'),
  ('evidence','de','Nachweise',
   'Sammle und referenziere Logs, Reports, Screenshots als Evidenz für Prüfungen/Audits.'),
  ('training','de','Schulungen',
   'Plane, führe durch und dokumentiere Trainings. Zertifikate werden mit QR verifiziert.'),
  ('admin','de','Admin',
   'Benutzer, Rollen/RBAC, Mandanten, Integrationen (z. B. Postmark/Stripe).'),
  ('billing','de','Abrechnung',
   'Abos, Lizenzen, Rechnungen. Nur für Admins sichtbar.')
on conflict (module, locale, title) do nothing;