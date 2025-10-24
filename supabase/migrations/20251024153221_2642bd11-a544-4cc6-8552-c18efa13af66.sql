-- Onboarding & Scope Matrix Tables

-- 1) Organizational Units
CREATE TABLE IF NOT EXISTS public.orgunits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.orgunits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_orgunits_tenant ON public.orgunits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orgunits_parent ON public.orgunits(parent_id);

-- 2) Assets
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system','application','infrastructure','data','other')),
  criticality TEXT NOT NULL CHECK (criticality IN ('low','med','high','critical')) DEFAULT 'med',
  owner_id UUID REFERENCES auth.users(id),
  ou_id UUID REFERENCES public.orgunits(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON public.assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON public.assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_ou ON public.assets(ou_id);

-- 3) Processes
CREATE TABLE IF NOT EXISTS public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criticality TEXT NOT NULL CHECK (criticality IN ('low','med','high','critical')) DEFAULT 'med',
  owner_id UUID REFERENCES auth.users(id),
  ou_id UUID REFERENCES public.orgunits(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processes_tenant ON public.processes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processes_owner ON public.processes(owner_id);

-- 4) Tenant Frameworks (which frameworks are active)
CREATE TABLE IF NOT EXISTS public.tenant_frameworks (
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  framework_code TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, framework_code)
);

-- 5) Policy Assignments (Control -> Scope Mapping)
CREATE TABLE IF NOT EXISTS public.policy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  scope_ref JSONB NOT NULL, -- {type: 'orgunit'|'asset'|'process', id: uuid}
  owner_id UUID REFERENCES auth.users(id),
  inheritance_rule TEXT CHECK (inheritance_rule IN ('inherit','override','none')) DEFAULT 'inherit',
  exception_flag BOOLEAN DEFAULT FALSE,
  exception_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, control_id, scope_ref)
);

CREATE INDEX IF NOT EXISTS idx_policy_assignments_tenant ON public.policy_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_control ON public.policy_assignments(control_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_owner ON public.policy_assignments(owner_id);

-- 6) Tenant Settings Extension (onboarding flags)
ALTER TABLE public."Unternehmen"
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_progress INTEGER DEFAULT 0 CHECK (onboarding_progress >= 0 AND onboarding_progress <= 100),
  ADD COLUMN IF NOT EXISTS criticality_profile TEXT CHECK (criticality_profile IN ('low','med','high')),
  ADD COLUMN IF NOT EXISTS headcount_band TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT;

-- 7) Triggers for updated_at
DROP TRIGGER IF EXISTS trg_orgunits_updated ON public.orgunits;
CREATE TRIGGER trg_orgunits_updated BEFORE UPDATE ON public.orgunits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_assets_updated ON public.assets;
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_processes_updated ON public.processes;
CREATE TRIGGER trg_processes_updated BEFORE UPDATE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_policy_assignments_updated ON public.policy_assignments;
CREATE TRIGGER trg_policy_assignments_updated BEFORE UPDATE ON public.policy_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) RLS Policies
ALTER TABLE public.orgunits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_assignments ENABLE ROW LEVEL SECURITY;

-- OrgUnits policies
CREATE POLICY orgunits_tenant_read ON public.orgunits
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY orgunits_admin_write ON public.orgunits
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- Assets policies
CREATE POLICY assets_tenant_read ON public.assets
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY assets_admin_write ON public.assets
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- Processes policies
CREATE POLICY processes_tenant_read ON public.processes
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY processes_admin_write ON public.processes
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- Tenant Frameworks policies
CREATE POLICY tenant_frameworks_read ON public.tenant_frameworks
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY tenant_frameworks_admin_write ON public.tenant_frameworks
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- Policy Assignments policies
CREATE POLICY policy_assignments_tenant_read ON public.policy_assignments
  FOR SELECT USING (tenant_id = get_user_company(auth.uid()));

CREATE POLICY policy_assignments_admin_write ON public.policy_assignments
  FOR ALL USING (
    tenant_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))
  );

-- 9) Service role grants
GRANT SELECT, INSERT, UPDATE ON public.orgunits, public.assets, public.processes, public.tenant_frameworks, public.policy_assignments TO service_role;