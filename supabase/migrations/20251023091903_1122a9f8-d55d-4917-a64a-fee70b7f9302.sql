-- Sprint 2: Controls & Policy-Bibliothek
-- Erstellt Frameworks, Controls und Policy-Templates für Compliance-Management

-- Frameworks-Tabelle (NIS2, ISO27001, DORA, etc.)
CREATE TABLE IF NOT EXISTS public.frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, version)
);

-- Controls-Tabelle (einzelne Kontrollpunkte pro Framework)
CREATE TABLE IF NOT EXISTS public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  evidence_types TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework_id, code)
);

-- Policy-Templates-Tabelle (tenant-spezifische Richtlinienvorlagen)
CREATE TABLE IF NOT EXISTS public.policy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE RESTRICT,
  version INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, control_id, version)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_controls_framework ON public.controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_policy_templates_tenant ON public.policy_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policy_templates_control ON public.policy_templates(control_id);

-- RLS aktivieren
ALTER TABLE public.frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_templates ENABLE ROW LEVEL SECURITY;

-- Frameworks und Controls sind öffentlich lesbar (Reference-Daten)
CREATE POLICY frameworks_public_read ON public.frameworks
  FOR SELECT
  USING (true);

CREATE POLICY controls_public_read ON public.controls
  FOR SELECT
  USING (true);

-- Policy-Templates: Mitglieder können lesen, Owner/Admin/Editor können schreiben
CREATE POLICY policy_templates_select ON public.policy_templates
  FOR SELECT
  USING (
    tenant_id = get_user_company(auth.uid())
  );

CREATE POLICY policy_templates_insert ON public.policy_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = get_user_company(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id = tenant_id
        AND role IN ('master_admin', 'admin', 'editor')
    )
  );

CREATE POLICY policy_templates_update ON public.policy_templates
  FOR UPDATE
  USING (
    tenant_id = get_user_company(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id = tenant_id
        AND role IN ('master_admin', 'admin', 'editor')
    )
  );

CREATE POLICY policy_templates_delete ON public.policy_templates
  FOR DELETE
  USING (
    tenant_id = get_user_company(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id = tenant_id
        AND role IN ('master_admin', 'admin')
    )
  );

-- Trigger für automatische Timestamps
CREATE TRIGGER update_policy_templates_updated_at
  BEFORE UPDATE ON public.policy_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed-Daten: NIS2 Framework
INSERT INTO public.frameworks (code, title, version, description)
VALUES 
  ('NIS2', 'NIS2 Directive', '2023', 'Network and Information Security Directive (EU) 2022/2555'),
  ('ISO27001', 'ISO/IEC 27001', '2022', 'Information Security Management Systems'),
  ('DORA', 'Digital Operational Resilience Act', '2023', 'EU Regulation on Digital Operational Resilience')
ON CONFLICT (code, version) DO NOTHING;

-- Seed-Daten: Basis NIS2 Controls
INSERT INTO public.controls (framework_id, code, title, objective, severity, evidence_types)
SELECT 
  f.id,
  'NIS2-01',
  'Risk Management',
  'Establish and maintain a comprehensive risk management process',
  'critical',
  ARRAY['policy', 'report', 'assessment']
FROM public.frameworks f WHERE f.code = 'NIS2' AND f.version = '2023'
ON CONFLICT (framework_id, code) DO NOTHING;

INSERT INTO public.controls (framework_id, code, title, objective, severity, evidence_types)
SELECT 
  f.id,
  'NIS2-02',
  'Incident Handling',
  'Implement incident detection, response, and recovery procedures',
  'high',
  ARRAY['procedure', 'log', 'report']
FROM public.frameworks f WHERE f.code = 'NIS2' AND f.version = '2023'
ON CONFLICT (framework_id, code) DO NOTHING;

INSERT INTO public.controls (framework_id, code, title, objective, severity, evidence_types)
SELECT 
  f.id,
  'NIS2-03',
  'Business Continuity',
  'Ensure continuity of critical operations during disruptions',
  'high',
  ARRAY['plan', 'test-report', 'procedure']
FROM public.frameworks f WHERE f.code = 'NIS2' AND f.version = '2023'
ON CONFLICT (framework_id, code) DO NOTHING;

INSERT INTO public.controls (framework_id, code, title, objective, severity, evidence_types)
SELECT 
  f.id,
  'NIS2-04',
  'Supply Chain Security',
  'Manage cybersecurity risks from suppliers and service providers',
  'medium',
  ARRAY['assessment', 'contract', 'audit']
FROM public.frameworks f WHERE f.code = 'NIS2' AND f.version = '2023'
ON CONFLICT (framework_id, code) DO NOTHING;