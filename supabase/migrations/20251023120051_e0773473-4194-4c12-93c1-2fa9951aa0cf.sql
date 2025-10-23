-- Performance indexes for controls search (simple B-tree indexes)
CREATE INDEX IF NOT EXISTS idx_controls_code ON controls (code);
CREATE INDEX IF NOT EXISTS idx_controls_title ON controls (title);