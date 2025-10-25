-- Audit-Trail für Training Certificate Verifizierung
CREATE OR REPLACE FUNCTION public.log_tc_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_details jsonb;
BEGIN
  -- Nur loggen wenn Status oder Verifizierung sich ändert
  IF (NEW.status IS DISTINCT FROM OLD.status) OR 
     (NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
    
    v_details := jsonb_build_object(
      'certificate_id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'from_status', OLD.status,
      'to_status', NEW.status,
      'verified_by', NEW.verified_by,
      'verified_at', NEW.verified_at,
      'notes', NEW.notes
    );
    
    -- Prüfe ob audit_log Tabelle existiert und schreibe Event
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
      INSERT INTO public.audit_log (
        tenant_id, 
        actor_id, 
        action, 
        entity, 
        entity_id, 
        payload
      ) VALUES (
        NEW.tenant_id,
        COALESCE(NEW.verified_by, auth.uid()),
        CASE 
          WHEN NEW.status = 'verified' THEN 'training_certificate.verified'
          WHEN NEW.status = 'rejected' THEN 'training_certificate.rejected'
          ELSE 'training_certificate.updated'
        END,
        'training_certificate',
        NEW.id::text,
        v_details
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trg_tc_verify_audit ON public.training_certificates;
CREATE TRIGGER trg_tc_verify_audit
  AFTER UPDATE ON public.training_certificates
  FOR EACH ROW 
  EXECUTE FUNCTION public.log_tc_verification();