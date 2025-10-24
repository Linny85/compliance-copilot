-- Scope Matrix: Indizes, Views, Resolver für Vererbung/Override/Ausnahmen

-- Schnellere JSONB-Scope-Abfragen
CREATE INDEX IF NOT EXISTS idx_policy_assignments_scope_gin
  ON public.policy_assignments USING gin (scope_ref jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_policy_assignments_flags
  ON public.policy_assignments (tenant_id, control_id, exception_flag, inheritance_rule, updated_at);

-- Scopes vereinheitlichen (OrgUnits/Assets/Prozesse)
CREATE OR REPLACE VIEW public.v_scopes AS
SELECT 'orgunit'::text AS scope_type, id::uuid AS scope_id, tenant_id, name FROM public.orgunits
UNION ALL
SELECT 'asset', id, tenant_id, name FROM public.assets
UNION ALL
SELECT 'process', id, tenant_id, name FROM public.processes;

-- Effektive Zuweisungen pro (tenant, control, scope)
-- v1: Keine Baum-Vererbung; "inherit" = direkte, vererbbare Zuweisung am Scope.
CREATE OR REPLACE VIEW public.v_effective_controls AS
WITH raw AS (
  SELECT
    pa.tenant_id,
    pa.control_id,
    (pa.scope_ref->>'type')::text AS scope_type,
    (pa.scope_ref->>'id')::uuid  AS scope_id,
    pa.owner_id,
    pa.inheritance_rule,
    pa.exception_flag,
    pa.exception_reason,
    pa.created_at,
    pa.updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY pa.tenant_id, pa.control_id, (pa.scope_ref->>'type'), (pa.scope_ref->>'id')
      ORDER BY
        pa.exception_flag DESC,
        (pa.inheritance_rule = 'override') DESC,
        pa.updated_at DESC
    ) AS rk
  FROM public.policy_assignments pa
)
SELECT
  tenant_id, control_id, scope_type, scope_id, owner_id,
  inheritance_rule,
  exception_flag, exception_reason,
  created_at, updated_at,
  CASE
    WHEN exception_flag THEN 'exception'
    WHEN inheritance_rule = 'override' THEN 'override'
    WHEN inheritance_rule = 'inherit' THEN 'direct'
    ELSE 'direct'
  END AS effective_mode
FROM raw
WHERE rk = 1;

-- Konflikt-View
CREATE OR REPLACE VIEW public.v_scope_conflicts AS
WITH grouped AS (
  SELECT
    tenant_id,
    control_id,
    (scope_ref->>'type')::text AS scope_type,
    (scope_ref->>'id')::uuid  AS scope_id,
    ARRAY_AGG(inheritance_rule ORDER BY updated_at DESC) AS rules,
    BOOL_OR(exception_flag) AS has_exception,
    COUNT(*) AS cnt
  FROM public.policy_assignments
  GROUP BY 1,2,3,4
)
SELECT
  tenant_id, control_id, scope_type, scope_id, rules, has_exception, cnt,
  CASE
    WHEN cnt > 1 AND ('override' = ANY(rules) AND 'inherit' = ANY(rules))
      THEN 'override_vs_inherit'
    WHEN cnt > 1
      THEN 'duplicate_assignments'
    ELSE NULL
  END AS conflict_kind
FROM grouped
WHERE cnt > 1;

-- Resolver-Funktion (für API & UI)
CREATE OR REPLACE FUNCTION public.resolve_effective_control(
  p_tenant uuid,
  p_control uuid,
  p_scope_type text,
  p_scope_id uuid
)
RETURNS TABLE(
  owner_id uuid,
  effective_mode text,
  exception_flag boolean,
  exception_reason text,
  source_assignments jsonb
) LANGUAGE plpgsql STABLE AS $$
DECLARE rows jsonb;
BEGIN
  SELECT jsonb_agg(to_jsonb(pa.*)) INTO rows
  FROM public.policy_assignments pa
  WHERE pa.tenant_id = p_tenant
    AND pa.control_id = p_control
    AND (pa.scope_ref->>'type') = p_scope_type
    AND (pa.scope_ref->>'id')::uuid = p_scope_id;

  IF rows IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE, NULL::text, '[]'::jsonb;
    RETURN;
  END IF;

  RETURN QUERY
  WITH parsed AS (
    SELECT
      (elem->>'owner_id')::uuid AS owner_id,
      (elem->>'exception_flag')::boolean AS exception_flag,
      elem->>'exception_reason' AS exception_reason,
      elem->>'inheritance_rule' AS inheritance_rule,
      (elem->>'updated_at')::timestamptz AS updated_at
    FROM jsonb_array_elements(rows) elem
  )
  SELECT
    p.owner_id,
    CASE
      WHEN p.exception_flag THEN 'exception'
      WHEN p.inheritance_rule = 'override' THEN 'override'
      ELSE 'direct'
    END AS effective_mode,
    p.exception_flag,
    p.exception_reason,
    rows
  FROM parsed p
  ORDER BY
    p.exception_flag DESC,
    (p.inheritance_rule = 'override') DESC,
    p.updated_at DESC
  LIMIT 1;
END$$;

-- Grant views to authenticated users
GRANT SELECT ON public.v_scopes TO authenticated;
GRANT SELECT ON public.v_effective_controls TO authenticated;
GRANT SELECT ON public.v_scope_conflicts TO authenticated;