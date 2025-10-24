-- 1) Log-Tabelle für strukturiertes Error-Logging & Latenz-Monitoring
CREATE TABLE IF NOT EXISTS public.helpbot_logs (
  id            BIGSERIAL PRIMARY KEY,
  ts            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level         TEXT NOT NULL CHECK (level IN ('info','warn','error')),
  func          TEXT NOT NULL,
  tenant_id     TEXT,
  session_id    TEXT,
  using_proxy   BOOLEAN,
  base_url      TEXT,
  path          TEXT,
  method        TEXT,
  status        INTEGER,
  latency_ms    INTEGER,
  error_code    TEXT,
  message       TEXT,
  details       JSONB
);

-- 2) Performance-Indizes
CREATE INDEX IF NOT EXISTS idx_helpbot_logs_ts ON public.helpbot_logs (ts DESC);
CREATE INDEX IF NOT EXISTS idx_helpbot_logs_func_ts ON public.helpbot_logs (func, ts DESC);
CREATE INDEX IF NOT EXISTS idx_helpbot_logs_level_ts ON public.helpbot_logs (level, ts DESC);
CREATE INDEX IF NOT EXISTS idx_helpbot_logs_tenant_ts ON public.helpbot_logs (tenant_id, ts DESC);

-- 3) RLS aktivieren
ALTER TABLE public.helpbot_logs ENABLE ROW LEVEL SECURITY;

-- 4) Policy für Service-Role mit DO-Block (weil CREATE POLICY IF NOT EXISTS nicht unterstützt wird)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'helpbot_logs' 
    AND policyname = 'allow_service_role_all'
  ) THEN
    CREATE POLICY allow_service_role_all 
      ON public.helpbot_logs 
      FOR ALL 
      USING (TRUE) 
      WITH CHECK (TRUE);
  END IF;
END $$;