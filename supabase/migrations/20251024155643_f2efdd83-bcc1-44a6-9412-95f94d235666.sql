-- Vendor Risk Management: Vendors, Profiles, Questionnaires, Assessments, Answers, SLAs

-- 1) Stammdaten
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  criticality TEXT CHECK (criticality IN ('low','med','high','critical')) DEFAULT 'med',
  data_classes TEXT[] DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('new','in_review','approved','restricted','offboarded')) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- 2) Risikoprofile/Vorlagen
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  weighting JSONB NOT NULL DEFAULT '{}'::jsonb,
  questionnaire_id UUID,
  UNIQUE (tenant_id, code)
);

-- 3) Fragebogen-Struktur
CREATE TABLE IF NOT EXISTS public.vendor_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT CHECK (status IN ('draft','published','retired')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, code, version)
);

CREATE TABLE IF NOT EXISTS public.vendor_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  questionnaire_id UUID NOT NULL REFERENCES public.vendor_questionnaires(id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  code TEXT NOT NULL,
  prompt TEXT NOT NULL,
  type TEXT CHECK (type IN ('bool','text','single','multi','number','file')) NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  weight NUMERIC NOT NULL DEFAULT 1,
  required BOOLEAN DEFAULT TRUE,
  control_id UUID,
  UNIQUE (questionnaire_id, code)
);

-- 4) Assessments & Antworten
CREATE TABLE IF NOT EXISTS public.vendor_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL REFERENCES public.vendor_questionnaires(id),
  status TEXT CHECK (status IN ('open','submitted','in_review','scored','closed')) DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  due_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  score JSONB DEFAULT '{}'::jsonb,
  risk_level TEXT CHECK (risk_level IN ('low','med','high','critical')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  assessment_id UUID NOT NULL REFERENCES public.vendor_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.vendor_questions(id) ON DELETE CASCADE,
  value JSONB,
  evidence_id UUID REFERENCES public.evidences(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);

-- 5) Indizes
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON public.vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_assessments_vendor ON public.vendor_assessments(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_answers_assessment ON public.vendor_answers(assessment_id);

-- 6) Triggers
CREATE TRIGGER set_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vendor_questionnaires_updated_at BEFORE UPDATE ON public.vendor_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vendor_assessments_updated_at BEFORE UPDATE ON public.vendor_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vendor_answers_updated_at BEFORE UPDATE ON public.vendor_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_answers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY vendors_tenant_read ON public.vendors
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendors_tenant_write ON public.vendors
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
     has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

CREATE POLICY vendor_profiles_tenant_read ON public.vendor_profiles
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_profiles_tenant_write ON public.vendor_profiles
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
     has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

CREATE POLICY vendor_questionnaires_tenant_read ON public.vendor_questionnaires
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_questionnaires_tenant_write ON public.vendor_questionnaires
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
     has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

CREATE POLICY vendor_questions_tenant_read ON public.vendor_questions
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_questions_tenant_write ON public.vendor_questions
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
     has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

CREATE POLICY vendor_assessments_tenant_read ON public.vendor_assessments
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_assessments_tenant_write ON public.vendor_assessments
  FOR ALL USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_answers_tenant_read ON public.vendor_answers
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY vendor_answers_tenant_write ON public.vendor_answers
  FOR ALL USING (tenant_id = get_user_company(auth.uid()));

-- 8) Views
CREATE OR REPLACE VIEW public.v_vendor_overview AS
SELECT v.*,
  (SELECT a.status FROM vendor_assessments a WHERE a.vendor_id = v.id ORDER BY a.updated_at DESC LIMIT 1) AS latest_status,
  (SELECT a.risk_level FROM vendor_assessments a WHERE a.vendor_id = v.id ORDER BY a.updated_at DESC LIMIT 1) AS latest_risk,
  (SELECT a.score->>'overall' FROM vendor_assessments a WHERE a.vendor_id = v.id ORDER BY a.updated_at DESC LIMIT 1) AS latest_score
FROM public.vendors v;

CREATE OR REPLACE VIEW public.v_vendor_answers_export AS
SELECT va.*, v.name AS vendor_name, vq.code AS question_code, vq.control_id
FROM public.vendor_answers va
JOIN public.vendor_assessments a ON a.id = va.assessment_id
JOIN public.vendors v ON v.id = a.vendor_id
JOIN public.vendor_questions vq ON vq.id = va.question_id;

-- Grant views to authenticated
GRANT SELECT ON public.v_vendor_overview TO authenticated;
GRANT SELECT ON public.v_vendor_answers_export TO authenticated;