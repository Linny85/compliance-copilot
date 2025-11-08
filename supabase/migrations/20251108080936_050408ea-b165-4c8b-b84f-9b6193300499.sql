-- Add indexes for risk_templates table for better performance
CREATE INDEX IF NOT EXISTS idx_risk_templates_code ON risk_templates(code);
CREATE INDEX IF NOT EXISTS idx_risk_templates_titles ON risk_templates(lower(title_de));

-- Ensure grants are correct
GRANT SELECT ON risk_templates TO authenticated;