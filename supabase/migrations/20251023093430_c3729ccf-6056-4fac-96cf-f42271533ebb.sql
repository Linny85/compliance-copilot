-- Enable RLS for global library tables
ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'frameworks' 
    AND policyname = 'frameworks_read_all'
  ) THEN
    CREATE POLICY frameworks_read_all ON frameworks 
    FOR SELECT 
    USING (auth.role() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'controls' 
    AND policyname = 'controls_read_all'
  ) THEN
    CREATE POLICY controls_read_all ON controls 
    FOR SELECT 
    USING (auth.role() IS NOT NULL);
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_controls_framework_id ON controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_controls_code ON controls(code);
CREATE INDEX IF NOT EXISTS idx_controls_severity ON controls(severity);
CREATE INDEX IF NOT EXISTS idx_policy_templates_tenant_id ON policy_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policy_templates_control_id ON policy_templates(control_id);