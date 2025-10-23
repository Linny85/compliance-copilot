-- Sprint 3 Hardening: Unique Constraints (Race Condition Protection)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_scope_unit' 
    AND conrelid = 'scope_units'::regclass
  ) THEN
    ALTER TABLE scope_units ADD CONSTRAINT uq_scope_unit UNIQUE (tenant_id, kind, name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_assignment' 
    AND conrelid = 'scope_assignments'::regclass
  ) THEN
    ALTER TABLE scope_assignments ADD CONSTRAINT uq_assignment UNIQUE (tenant_id, control_id, unit_id);
  END IF;
END $$;