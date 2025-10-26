-- Postmark Template Aliases für Standard-Kommunikation
-- Optional: kannst du Templates als Referenzliste pflegen
create table if not exists public.email_template_aliases (
  alias text primary key,
  description text,
  created_at timestamptz default now()
);

insert into public.email_template_aliases (alias, description)
values
  ('dev_test_mail', 'Entwickler-Test-Mail'),
  ('trial_started', 'Start der Testphase'),
  ('trial_7d_left', 'Noch 7 Tage übrig'),
  ('trial_ending_tomorrow', 'Letzter Testtag'),
  ('trial_ended', 'Testphase abgelaufen'),
  ('weekly_report', 'Wöchentlicher Bericht')
on conflict (alias) do nothing;
