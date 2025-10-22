-- Fix: Allow authenticated users to create companies during onboarding
-- The edge function already prevents duplicate company creation per user

CREATE POLICY "Authenticated users can create companies during onboarding"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);