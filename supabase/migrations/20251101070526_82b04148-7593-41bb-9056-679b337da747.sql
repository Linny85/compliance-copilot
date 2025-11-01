-- Add secure master password fields to Unternehmen table
ALTER TABLE public."Unternehmen"
  ADD COLUMN IF NOT EXISTS master_pass_salt text,
  ADD COLUMN IF NOT EXISTS master_pass_hash text,
  ADD COLUMN IF NOT EXISTS master_pass_algo text DEFAULT 'pbkdf2-sha256',
  ADD COLUMN IF NOT EXISTS master_pass_iter int DEFAULT 210000;

-- Create audit_events table for security logging
CREATE TABLE IF NOT EXISTS public.audit_events (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public."Unternehmen"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit_events
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit events for their company
CREATE POLICY "audit_events_select"
ON public.audit_events
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Service role can insert audit events
CREATE POLICY "audit_events_service_insert"
ON public.audit_events
FOR INSERT
WITH CHECK (true);