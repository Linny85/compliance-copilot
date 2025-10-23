-- Unique constraint: one code per tenant
ALTER TABLE check_rules
  ADD CONSTRAINT uniq_check_rules_tenant_code UNIQUE (tenant_id, code);

-- Sensible default for enabled
ALTER TABLE check_rules
  ALTER COLUMN enabled SET DEFAULT true;

-- Optional: Index for controls select (if tenant_id exists on controls table)
-- CREATE INDEX IF NOT EXISTS idx_controls_framework ON controls(framework_id, code);