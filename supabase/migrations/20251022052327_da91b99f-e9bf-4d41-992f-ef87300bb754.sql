-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('master_admin', 'admin', 'member');

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  sector TEXT,
  country TEXT,
  master_code TEXT NOT NULL UNIQUE,
  delete_code TEXT NOT NULL UNIQUE,
  subscription_status TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id, role)
);

-- Create NIS2 risks table
CREATE TABLE public.nis2_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'mitigated', 'closed')),
  mitigation_plan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI systems table
CREATE TABLE public.ai_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  risk_classification TEXT CHECK (risk_classification IN ('minimal', 'limited', 'high', 'unacceptable')),
  purpose TEXT,
  data_types TEXT[],
  deployment_status TEXT DEFAULT 'planned' CHECK (deployment_status IN ('planned', 'development', 'deployed', 'retired')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nis2_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_systems ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _company_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = _role
  )
$$;

-- Security definer function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company(auth.uid()));

CREATE POLICY "Master admins can update their company"
  ON public.companies FOR UPDATE
  USING (
    public.has_role(auth.uid(), id, 'master_admin')
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their company"
  ON public.user_roles FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Master admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), company_id, 'master_admin')
  );

-- RLS Policies for nis2_risks
CREATE POLICY "Users can view risks in their company"
  ON public.nis2_risks FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can create risks for their company"
  ON public.nis2_risks FOR INSERT
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can update risks in their company"
  ON public.nis2_risks FOR UPDATE
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can delete risks"
  ON public.nis2_risks FOR DELETE
  USING (
    public.has_role(auth.uid(), company_id, 'master_admin') OR
    public.has_role(auth.uid(), company_id, 'admin')
  );

-- RLS Policies for ai_systems
CREATE POLICY "Users can view AI systems in their company"
  ON public.ai_systems FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can create AI systems for their company"
  ON public.ai_systems FOR INSERT
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can update AI systems in their company"
  ON public.ai_systems FOR UPDATE
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can delete AI systems"
  ON public.ai_systems FOR DELETE
  USING (
    public.has_role(auth.uid(), company_id, 'master_admin') OR
    public.has_role(auth.uid(), company_id, 'admin')
  );

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nis2_risks_updated_at
  BEFORE UPDATE ON public.nis2_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_systems_updated_at
  BEFORE UPDATE ON public.ai_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();