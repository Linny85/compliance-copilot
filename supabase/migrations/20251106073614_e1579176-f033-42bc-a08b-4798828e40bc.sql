
-- Add training influence configuration to tenant_settings
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS overall_training_mode text 
    CHECK (overall_training_mode IN ('weighted','strict')) DEFAULT 'weighted',
  ADD COLUMN IF NOT EXISTS overall_training_weight numeric 
    CHECK (overall_training_weight >= 0 AND overall_training_weight <= 1) DEFAULT 0.2;

COMMENT ON COLUMN tenant_settings.overall_training_mode IS 'How training influences overall score: weighted (blend) or strict (cap)';
COMMENT ON COLUMN tenant_settings.overall_training_weight IS 'Weight of training in weighted mode (e.g. 0.2 = 20% training, 80% framework)';
