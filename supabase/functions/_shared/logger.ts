// _shared/logger.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type LogLevel = 'info' | 'warn' | 'error';

export type HelpbotLog = {
  level: LogLevel;
  func: string;
  tenant_id?: string | null;
  session_id?: string | null;
  using_proxy?: boolean | null;
  base_url?: string | null;
  path?: string | null;
  method?: string | null;
  status?: number | null;
  latency_ms?: number | null;
  error_code?: string | null;
  message: string;
  details?: Record<string, unknown> | null;
};

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

export async function logEvent(entry: HelpbotLog): Promise<void> {
  try {
    // details defensiv kürzen (max ~4KB)
    let details = entry.details ? JSON.parse(JSON.stringify(entry.details)) : null;
    const payload = { ...entry, details };
    const { error } = await sb.from('helpbot_logs').insert(payload);
    if (error) console.error('[logger] insert error:', error);
  } catch (e) {
    console.error('[logger] fatal:', e);
  }
}

// Bequeme Helfer
export const logInfo  = (e: Omit<HelpbotLog,'level'>) => logEvent({ level: 'info',  ...e });
export const logWarn  = (e: Omit<HelpbotLog,'level'>) => logEvent({ level: 'warn',  ...e });
export const logError = (e: Omit<HelpbotLog,'level'>) => logEvent({ level: 'error', ...e });
