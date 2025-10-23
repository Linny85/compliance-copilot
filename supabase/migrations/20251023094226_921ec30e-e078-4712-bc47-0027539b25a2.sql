-- Sprint 3: Scope Matrix - Units & Assignments

-- 1) Einheiten, denen Kontrollen zugewiesen werden (Bereiche/Prozesse/Systeme/Lieferanten)
CREATE TABLE IF NOT EXISTS scope_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Unternehmen"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('business_unit','process','system','vendor')),
  name TEXT NOT NULL,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Zuweisungen Kontrolle ↔ Einheit
CREATE TABLE IF NOT EXISTS scope_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Unternehmen"(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES scope_units(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in_scope','out_of_scope','exception')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, control_id, unit_id)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_scope_units_tenant_kind ON scope_units(tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_scope_assignments_tenant ON scope_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scope_assignments_control ON scope_assignments(control_id);
CREATE INDEX IF NOT EXISTS idx_scope_assignments_unit ON scope_assignments(unit_id);

-- RLS aktivieren
ALTER TABLE scope_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: alle Mitglieder des Tenants
CREATE POLICY scope_units_select ON scope_units
FOR SELECT USING (
  tenant_id = get_user_company(auth.uid())
);

CREATE POLICY scope_assignments_select ON scope_assignments
FOR SELECT USING (
  tenant_id = get_user_company(auth.uid())
);

-- INSERT: nur master_admin/admin/editor
CREATE POLICY scope_units_insert ON scope_units
FOR INSERT WITH CHECK (
  tenant_id = get_user_company(auth.uid()) AND
  (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'editor'::app_role)
  )
);

CREATE POLICY scope_assignments_insert ON scope_assignments
FOR INSERT WITH CHECK (
  tenant_id = get_user_company(auth.uid()) AND
  (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'editor'::app_role)
  )
);

-- UPDATE: nur master_admin/admin/editor
CREATE POLICY scope_units_update ON scope_units
FOR UPDATE USING (
  tenant_id = get_user_company(auth.uid()) AND
  (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'editor'::app_role)
  )
);

CREATE POLICY scope_assignments_update ON scope_assignments
FOR UPDATE USING (
  tenant_id = get_user_company(auth.uid()) AND
  (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'editor'::app_role)
  )
);

-- DELETE: nur master_admin/admin/editor
CREATE POLICY scope_units_delete ON scope_units
FOR DELETE USING (
  tenant_id = get_user_company(auth.uid()) AND
  (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'editor'::app_role)
  )
);

CREATE POLICY scope_assignments_delete ON scope_assignments
FOR DELETE USING (
  tenant_id = get_user_company(auth.uid()) AND
  (
    has_role(auth.uid(), tenant_id, 'master_admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_role(auth.uid(), tenant_id, 'editor'::app_role)
  )
);