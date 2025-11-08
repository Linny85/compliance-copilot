-- Risk Templates für bessere UX im Risiko-Dialog
create table if not exists risk_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_de text not null,
  title_en text not null,
  title_sv text not null,
  default_level text check (default_level in ('low','medium','high')) default 'medium',
  default_status text check (default_status in ('open','in_progress','mitigated','closed')) default 'open',
  created_at timestamptz default now()
);

-- Initiale Vorlagen einfügen
insert into risk_templates (code, title_de, title_en, title_sv, default_level) values
('UNAUTH_ACCESS','Unbefugter Zugriff auf kritische Systeme','Unauthorized access to critical systems','Obehörig åtkomst till kritiska system','high'),
('PHISHING','Phishing & Social Engineering','Phishing & Social Engineering','Phishing & Social Engineering','medium'),
('DATA_BREACH','Datenschutzverletzung durch unzureichende Verschlüsselung','Data breach due to insufficient encryption','Dataintrång på grund av otillräcklig kryptering','high'),
('RANSOMWARE','Ransomware-Angriff','Ransomware attack','Ransomware-attack','high'),
('DDOS','DDoS-Angriff auf kritische Dienste','DDoS attack on critical services','DDoS-attack mot kritiska tjänster','medium'),
('INSIDER_THREAT','Insider-Bedrohung','Insider threat','Insider-hot','medium'),
('SUPPLY_CHAIN','Supply-Chain-Kompromittierung','Supply chain compromise','Kompromiss i leveranskedjan','high'),
('WEAK_AUTH','Schwache Authentifizierung','Weak authentication','Svag autentisering','medium'),
('UNPATCHED_SYS','Ungepatchte Systeme','Unpatched systems','Opatchade system','high'),
('DATA_LOSS','Datenverlust','Data loss','Dataförlust','medium')
on conflict (code) do nothing;

-- Grant Zugriff für authenticated users
grant select on risk_templates to authenticated;