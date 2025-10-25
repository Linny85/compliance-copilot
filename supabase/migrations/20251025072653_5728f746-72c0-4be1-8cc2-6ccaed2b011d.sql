-- Create demo tables with proper constraints and RLS

-- Demo companies table
CREATE TABLE IF NOT EXISTS public.demo_companies (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- Demo vendors table
CREATE TABLE IF NOT EXISTS public.demo_vendors (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  name text NOT NULL,
  criticality text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- Demo AI systems table
CREATE TABLE IF NOT EXISTS public.demo_ai_systems (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  name text NOT NULL,
  owner_company_id uuid,
  risk text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- Enable RLS
ALTER TABLE public.demo_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_ai_systems ENABLE ROW LEVEL SECURITY;

-- RLS policies for demo_companies
CREATE POLICY "Users can view their demo companies"
  ON public.demo_companies FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can manage their demo companies"
  ON public.demo_companies FOR ALL
  USING (tenant_id = auth.uid());

-- RLS policies for demo_vendors
CREATE POLICY "Users can view their demo vendors"
  ON public.demo_vendors FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can manage their demo vendors"
  ON public.demo_vendors FOR ALL
  USING (tenant_id = auth.uid());

-- RLS policies for demo_ai_systems
CREATE POLICY "Users can view their demo AI systems"
  ON public.demo_ai_systems FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can manage their demo AI systems"
  ON public.demo_ai_systems FOR ALL
  USING (tenant_id = auth.uid());