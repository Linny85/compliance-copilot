-- RLS-Härtung für alle vendor_* Tabellen (idempotent)

-- Policies für vendor_profiles
DROP POLICY IF EXISTS vendor_profiles_tenant_read ON public.vendor_profiles;
DROP POLICY IF EXISTS vendor_profiles_tenant_write ON public.vendor_profiles;

CREATE POLICY vendor_profiles_tenant_read ON public.vendor_profiles
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_profiles_admin_write ON public.vendor_profiles
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- Policies für vendor_questionnaires
DROP POLICY IF EXISTS vendor_questionnaires_tenant_read ON public.vendor_questionnaires;
DROP POLICY IF EXISTS vendor_questionnaires_tenant_write ON public.vendor_questionnaires;

CREATE POLICY vendor_questionnaires_tenant_read ON public.vendor_questionnaires
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_questionnaires_admin_write ON public.vendor_questionnaires
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- Policies für vendor_questions
DROP POLICY IF EXISTS vendor_questions_tenant_read ON public.vendor_questions;
DROP POLICY IF EXISTS vendor_questions_tenant_write ON public.vendor_questions;

CREATE POLICY vendor_questions_tenant_read ON public.vendor_questions
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_questions_admin_write ON public.vendor_questions
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- Policies für vendor_assessments
DROP POLICY IF EXISTS vendor_assessments_tenant_read ON public.vendor_assessments;
DROP POLICY IF EXISTS vendor_assessments_tenant_write ON public.vendor_assessments;

CREATE POLICY vendor_assessments_tenant_read ON public.vendor_assessments
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_assessments_tenant_write ON public.vendor_assessments
  FOR ALL USING (tenant_id = get_user_company(auth.uid()));

-- Policies für vendor_answers
DROP POLICY IF EXISTS vendor_answers_tenant_read ON public.vendor_answers;
DROP POLICY IF EXISTS vendor_answers_tenant_write ON public.vendor_answers;

CREATE POLICY vendor_answers_tenant_read ON public.vendor_answers
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_answers_tenant_write ON public.vendor_answers
  FOR ALL USING (tenant_id = get_user_company(auth.uid()));

-- Updated_at Trigger für alle vendor_* Tabellen
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_assessments_updated_at ON public.vendor_assessments;
CREATE TRIGGER update_vendor_assessments_updated_at
  BEFORE UPDATE ON public.vendor_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_answers_updated_at ON public.vendor_answers;
CREATE TRIGGER update_vendor_answers_updated_at
  BEFORE UPDATE ON public.vendor_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index für Tasks-Abfragen
CREATE INDEX IF NOT EXISTS idx_tasks_ref ON public.tasks(tenant_id, ref_table, ref_id) WHERE ref_table IS NOT NULL;

-- Service-Role Grants (explizit)
GRANT SELECT, INSERT, UPDATE ON public.vendors TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.vendor_assessments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.vendor_answers TO service_role;
GRANT SELECT ON public.vendor_profiles TO service_role;
GRANT SELECT ON public.vendor_questionnaires TO service_role;
GRANT SELECT ON public.vendor_questions TO service_role;

-- Seed: Default Vendor Profile & Questionnaire
INSERT INTO public.vendor_profiles (tenant_id, code, title, weighting)
SELECT DISTINCT tenant_id, 'BASE', 'Standard Vendor Assessment', 
  '{"security":0.4,"privacy":0.4,"resilience":0.2}'::jsonb
FROM public.vendors
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO public.vendor_questionnaires (tenant_id, code, title, version, sections, status)
SELECT DISTINCT tenant_id, 'BASE-V1', 'Base Vendor Questionnaire', '1.0',
  '[{"code":"SEC","title":"Security","order":1},{"code":"PRIV","title":"Privacy","order":2},{"code":"RES","title":"Resilience","order":3}]'::jsonb,
  'published'
FROM public.vendors
ON CONFLICT (tenant_id, code, version) DO NOTHING;