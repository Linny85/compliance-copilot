-- Sync deutsche Übersetzungen für Controls (AI_ACT, GDPR, NIS2)
-- Ziel: Alle Titles/Objectives erscheinen in Deutsch ohne Fallbacks

INSERT INTO public.translations (tenant_id, namespace, tkey, locale, text, approved)
VALUES
  -- AI Act Controls
  (null,'controls','catalog.AI_ACT.AI-01.title','de','Daten-Governance',true),
  (null,'controls','catalog.AI_ACT.AI-01.objective','de','Sicherstellung der Datenqualität und -governance für KI-Systeme',true),
  
  -- GDPR Controls
  (null,'controls','catalog.GDPR.GDPR-03.title','de','Betroffenenrechte',true),
  (null,'controls','catalog.GDPR.GDPR-03.objective','de','Gewährleistung der Rechte betroffener Personen nach DSGVO Art. 15–22',true),
  
  -- NIS2 Controls
  (null,'controls','catalog.NIS2.NIS2-01.title','de','Risikomanagement',true),
  (null,'controls','catalog.NIS2.NIS2-01.objective','de','Implementierung eines umfassenden Informationssicherheits-Risikomanagements',true),
  (null,'controls','catalog.NIS2.NIS2-02.title','de','Incident Handling',true),
  (null,'controls','catalog.NIS2.NIS2-02.objective','de','Erkennung, Reaktion und Wiederherstellung nach Sicherheitsvorfällen sicherstellen',true),
  (null,'controls','catalog.NIS2.NIS2-03.title','de','Business Continuity',true),
  (null,'controls','catalog.NIS2.NIS2-03.objective','de','Aufrechterhaltung kritischer Geschäftsprozesse während Störungen sicherstellen',true),
  (null,'controls','catalog.NIS2.NIS2-04.title','de','Supply Chain Security',true),
  (null,'controls','catalog.NIS2.NIS2-04.objective','de','Cybersicherheitsrisiken von Lieferanten und Dienstleistern managen',true)
ON CONFLICT (coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), namespace, tkey, locale)
DO UPDATE SET 
  text = EXCLUDED.text,
  approved = EXCLUDED.approved,
  updated_at = now();