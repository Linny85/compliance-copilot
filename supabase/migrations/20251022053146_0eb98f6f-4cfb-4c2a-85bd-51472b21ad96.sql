-- Add subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider TEXT DEFAULT 'stripe',
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  external_customer_id TEXT,
  external_subscription_id TEXT,
  plan_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('policy', 'report', 'certificate')) NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target TEXT,
  meta_json JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update companies table to use hashed codes
ALTER TABLE public.companies
  RENAME COLUMN master_code TO master_code_hash;

ALTER TABLE public.companies
  RENAME COLUMN delete_code TO delete_code_hash;

-- Enable RLS on new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their company subscription"
  ON public.subscriptions FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Master admins can update subscription"
  ON public.subscriptions FOR UPDATE
  USING (
    public.has_role(auth.uid(), company_id, 'master_admin')
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their company"
  ON public.documents FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can create documents for their company"
  ON public.documents FOR INSERT
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (
    public.has_role(auth.uid(), company_id, 'master_admin') OR
    public.has_role(auth.uid(), company_id, 'admin')
  );

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs in their company"
  ON public.audit_logs FOR SELECT
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _company_id UUID,
  _actor_user_id UUID,
  _action TEXT,
  _target TEXT,
  _meta_json JSONB DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    company_id,
    actor_user_id,
    action,
    target,
    meta_json,
    ip_address
  ) VALUES (
    _company_id,
    _actor_user_id,
    _action,
    _target,
    _meta_json,
    _ip_address
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_audit_logs_company_created ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX idx_documents_company ON public.documents(company_id, created_at DESC);
CREATE INDEX idx_subscriptions_company ON public.subscriptions(company_id);

-- Trigger to auto-create subscription on company creation
CREATE OR REPLACE FUNCTION public.create_company_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    company_id,
    status,
    trial_start,
    trial_end
  ) VALUES (
    NEW.id,
    'trial',
    NOW(),
    NOW() + INTERVAL '14 days'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_company_subscription();