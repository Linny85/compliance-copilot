-- 1) Add columns for hash chain
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS chain_order BIGINT,
  ADD COLUMN IF NOT EXISTS prev_hash TEXT,
  ADD COLUMN IF NOT EXISTS event_hash TEXT,
  ADD COLUMN IF NOT EXISTS chain_ok BOOLEAN DEFAULT TRUE;

-- 2) Sequence for chain ordering
CREATE SEQUENCE IF NOT EXISTS public.audit_chain_seq;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_audit_tenant_order ON public.audit_log(tenant_id, chain_order);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_event_hash ON public.audit_log(event_hash);

-- 4) Utility: canonical JSON representation
CREATE OR REPLACE FUNCTION public.jsonb_canon(j JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Simple, stable canonicalization: sorted keys
  RETURN (SELECT string_agg(format('"%s":%s', key, COALESCE(value::text, 'null')), ',')
          FROM (
            SELECT key, j->key AS value
            FROM jsonb_object_keys(j) AS key
            ORDER BY key
          ) s);
END;
$$;

-- 5) Hash computation function
CREATE OR REPLACE FUNCTION public.compute_audit_hash(
  p_tenant UUID,
  p_created_at TIMESTAMPTZ,
  p_actor UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id TEXT,
  p_payload JSONB,
  p_ip INET,
  p_prev_hash TEXT
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base TEXT;
BEGIN
  base := concat_ws('|',
    coalesce(p_tenant::text,''),
    to_char(p_created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    coalesce(p_actor::text,''),
    coalesce(p_action,''),
    coalesce(p_entity,''),
    coalesce(p_entity_id,''),
    coalesce(public.jsonb_canon(p_payload),''),
    coalesce(p_ip::text,''),
    coalesce(p_prev_hash,'')
  );
  RETURN encode(digest(base,'sha256'),'hex');
END;
$$;

-- 6) BEFORE INSERT Trigger: set prev_hash, chain_order, event_hash
CREATE OR REPLACE FUNCTION public.audit_chain_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_hash TEXT;
  last_order BIGINT;
BEGIN
  -- Set chain_order as sequential
  NEW.chain_order := nextval('public.audit_chain_seq');

  -- Get last hash for this tenant
  SELECT event_hash, chain_order
    INTO last_hash, last_order
    FROM public.audit_log
    WHERE tenant_id = NEW.tenant_id
    ORDER BY chain_order DESC
    LIMIT 1;

  NEW.prev_hash := last_hash;

  -- Compute event hash
  NEW.event_hash := public.compute_audit_hash(
    NEW.tenant_id, 
    COALESCE(NEW.created_at, now()),
    NEW.actor_id, 
    NEW.action, 
    NEW.entity, 
    NEW.entity_id,
    NEW.payload, 
    NEW.ip, 
    NEW.prev_hash
  );

  NEW.chain_ok := TRUE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_chain_before_insert ON public.audit_log;
CREATE TRIGGER trg_audit_chain_before_insert
BEFORE INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_chain_before_insert();

-- 7) Verification function
CREATE OR REPLACE FUNCTION public.audit_verify_chain(
  p_tenant UUID, 
  p_from TIMESTAMPTZ, 
  p_to TIMESTAMPTZ
)
RETURNS TABLE(
  ok BOOLEAN,
  first_break_at BIGINT,
  checked_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev TEXT := NULL;
  rec RECORD;
  cnt BIGINT := 0;
  broken BIGINT := NULL;
  calc TEXT;
BEGIN
  FOR rec IN
    SELECT 
      chain_order, 
      tenant_id, 
      created_at, 
      actor_id, 
      action, 
      entity, 
      entity_id, 
      payload, 
      ip, 
      prev_hash, 
      event_hash
    FROM public.audit_log
    WHERE tenant_id = p_tenant 
      AND created_at BETWEEN p_from AND p_to
    ORDER BY chain_order
  LOOP
    calc := public.compute_audit_hash(
      rec.tenant_id, 
      rec.created_at, 
      rec.actor_id, 
      rec.action, 
      rec.entity, 
      rec.entity_id, 
      rec.payload, 
      rec.ip, 
      prev
    );
    
    cnt := cnt + 1;
    
    IF rec.prev_hash IS DISTINCT FROM prev OR rec.event_hash IS DISTINCT FROM calc THEN
      broken := rec.chain_order;
      EXIT;
    END IF;
    
    prev := rec.event_hash;
  END LOOP;

  -- Mark broken chain
  IF broken IS NOT NULL THEN
    UPDATE public.audit_log 
    SET chain_ok = FALSE 
    WHERE tenant_id = p_tenant AND chain_order = broken;
  END IF;

  RETURN QUERY SELECT (broken IS NULL) AS ok, broken AS first_break_at, cnt AS checked_count;
END;
$$;

-- 8) Backfill existing records (only if event_hash is NULL)
DO $$
DECLARE 
  r RECORD;
  cur_prev TEXT := NULL;
  cur_tenant UUID := NULL;
BEGIN
  FOR r IN
    SELECT id, tenant_id, created_at, actor_id, action, entity, entity_id, payload, ip
    FROM public.audit_log
    WHERE event_hash IS NULL
    ORDER BY tenant_id NULLS LAST, created_at, id
  LOOP
    -- Reset hash chain when tenant changes
    IF cur_tenant IS DISTINCT FROM r.tenant_id THEN
      cur_prev := NULL;
      cur_tenant := r.tenant_id;
    END IF;

    UPDATE public.audit_log SET
      chain_order = nextval('public.audit_chain_seq'),
      prev_hash = cur_prev,
      event_hash = public.compute_audit_hash(
        r.tenant_id, 
        r.created_at, 
        r.actor_id, 
        r.action, 
        r.entity, 
        r.entity_id, 
        r.payload, 
        r.ip, 
        cur_prev
      ),
      chain_ok = TRUE
    WHERE id = r.id;

    SELECT event_hash INTO cur_prev FROM public.audit_log WHERE id = r.id;
  END LOOP;
END$$;

-- Comments
COMMENT ON COLUMN public.audit_log.chain_order IS 'Sequential order in the audit chain';
COMMENT ON COLUMN public.audit_log.prev_hash IS 'Hash of previous event in chain (per tenant)';
COMMENT ON COLUMN public.audit_log.event_hash IS 'SHA256 hash of this event including prev_hash';
COMMENT ON COLUMN public.audit_log.chain_ok IS 'Integrity flag set to false if chain verification fails';
COMMENT ON FUNCTION public.audit_verify_chain IS 'Verifies audit chain integrity for a tenant in a time range';