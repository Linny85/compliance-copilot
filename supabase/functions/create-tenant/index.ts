import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// LOGGING UTILITIES (GDPR-compliant, structured JSON logs)
// ============================================================================

// Generate unique request ID
function makeReqId(): string {
  return crypto.randomUUID();
}

// Extract client IP from request headers
function getClientIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         undefined;
}

// Redact sensitive fields from objects
function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted = { ...obj };
  const sensitiveKeys = ['masterCode', 'deleteCode', 'master_code_hash', 'delete_code_hash'];
  
  for (const key in redacted) {
    // Redact known sensitive keys
    if (sensitiveKeys.includes(key) || key.toLowerCase().includes('password')) {
      redacted[key] = 'REDACTED';
    }
    // Recursively redact nested objects
    else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redact(redacted[key]);
    }
  }
  
  return redacted;
}

// Logger interface
interface LogData {
  reqId: string;
  path?: string;
  method?: string;
  userId?: string;
  tenantId?: string;
  ip?: string;
  [key: string]: any;
}

interface Logger {
  info(msg: string, data?: Record<string, any>): void;
  warn(msg: string, data?: Record<string, any>): void;
  error(msg: string, data?: Record<string, any>): void;
  startTimer(): (label?: string) => { label: string; ms: number };
}

// Create structured logger
function createLogger(req: Request, extra: LogData): Logger {
  const logLevel = Deno.env.get('LOG_LEVEL') || 'info';
  const levelMap: Record<string, number> = { error: 0, warn: 1, info: 2 };
  const currentLevel = levelMap[logLevel] || 2;
  
  const log = (level: string, msg: string, data?: Record<string, any>) => {
    if (levelMap[level] > currentLevel) return;
    
    const logEntry = {
      level,
      tsISO: new Date().toISOString(),
      reqId: extra.reqId,
      path: extra.path,
      method: extra.method,
      userId: extra.userId,
      tenantId: extra.tenantId,
      ip: extra.ip,
      msg,
      data: data ? redact(data) : undefined,
    };
    
    console.log(JSON.stringify(logEntry));
  };
  
  return {
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    startTimer: () => {
      const t0 = Date.now();
      return (label?: string) => {
        const actualLabel = label || 'operation';
        const ms = Date.now() - t0;
        log('info', `Timer: ${actualLabel}`, { label: actualLabel, ms });
        return { label: actualLabel, ms };
      };
    },
  };
}

// Simple hash function using Web Crypto API (SHA-256)
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface OnboardingRequest {
  company: {
    name: string;
    // Support both a single address field (preferred) and legacy street/zip/city fields
    address?: string;
    street?: string;
    zip?: string;
    city?: string;
    country: string;
    sector: string;
    website?: string;
    vatId?: string;
    companySize?: string;
    legalName?: string;
  };
  masterCode: string;
  deleteCode: string;
}

Deno.serve(async (req) => {
  // Initialize logger with request context
  const reqId = makeReqId();
  const ip = getClientIp(req);
  const log = createLogger(req, { 
    reqId, 
    path: new URL(req.url).pathname, 
    method: req.method,
    ip 
  });
  const endTimer = log.startTimer();

  if (req.method === 'OPTIONS') {
    log.info('CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log.info('Onboarding request started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    log.info('Verifying authentication');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log.error('Authentication failed', { error: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update logger context with userId
    const userLog = createLogger(req, { reqId, path: new URL(req.url).pathname, method: req.method, ip, userId: user.id });

    userLog.info('User authenticated successfully');

    // Check if user already has a company
    userLog.info('Checking for existing company');
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile?.company_id) {
      userLog.warn('User already has a company', { companyId: existingProfile.company_id });
      return new Response(
        JSON.stringify({ error: 'User already has a company' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userLog.info('Parsing request body');
    const body: OnboardingRequest = await req.json();
    const { company, masterCode, deleteCode } = body;

    userLog.info('Request body structure', { 
      hasName: !!company.name,
      hasCountry: !!company.country,
      hasSector: !!company.sector,
      hasAddress: !!company.address,
      hasLegacyFields: !!(company.street && company.zip && company.city),
      hasMasterCode: !!masterCode,
      hasDeleteCode: !!deleteCode,
    });

    // Diagnose → Plan → Apply
    // Diagnose: Ensure input meets API contract while keeping backward compatibility with legacy fields
    // Plan: Require name, country, sector, codes, and either address OR (street + zip + city)
    // Apply: Validate and 400 on failure
    const hasFullAddress = Boolean((company.address && company.address.trim()) ||
      (company.street && company.street.trim() && company.zip && company.zip.trim() && company.city && company.city.trim()));

    if (!company.name?.trim() || !company.country?.trim() || !company.sector?.trim() ||
        !masterCode?.trim() || !deleteCode?.trim() || !hasFullAddress) {
      userLog.error('Invalid input - missing required fields', {
        hasName: !!company.name?.trim(),
        hasCountry: !!company.country?.trim(),
        hasSector: !!company.sector?.trim(),
        hasMasterCode: !!masterCode?.trim(),
        hasDeleteCode: !!deleteCode?.trim(),
        hasFullAddress,
      });
      return new Response(
        JSON.stringify({ error: 'Invalid input. Please provide required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash codes server-side
    userLog.info('Hashing security codes');
    const masterCodeHash = await hashCode(masterCode);
    const deleteCodeHash = await hashCode(deleteCode);

    userLog.info('Creating company');
    // Create company
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: company.name?.trim(),
        legal_name: company.legalName?.trim(),
        // Prefer single address if provided; otherwise store legacy fields
        address: company.address?.trim(),
        street: company.street?.trim(),
        zip: company.zip?.trim(),
        city: company.city?.trim(),
        country: company.country?.trim(),
        sector: company.sector?.trim(),
        website: company.website?.trim(),
        vat_id: company.vatId?.trim(),
        company_size: company.companySize?.trim(),
        master_code_hash: masterCodeHash,
        delete_code_hash: deleteCodeHash,
      })
      .select()
      .single();

    if (companyError) {
      userLog.error('Company creation failed', { error: companyError.message, code: companyError.code });
      throw companyError;
    }

    const tenantId = newCompany.id;
    const tenantLog = createLogger(req, { reqId, path: new URL(req.url).pathname, method: req.method, ip, userId: user.id, tenantId });
    
    tenantLog.info('Company created successfully');

    // Update user profile with company_id
    tenantLog.info('Updating user profile');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        company_id: newCompany.id,
        email: user.email!,
        full_name: company.name,
      });

    if (profileError) {
      tenantLog.error('Profile update failed', { error: profileError.message });
      throw profileError;
    }

    tenantLog.info('Profile updated successfully');

    // Create master_admin role
    tenantLog.info('Creating master_admin role');
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        company_id: newCompany.id,
        role: 'master_admin',
      });

    if (roleError) {
      tenantLog.error('Role creation failed', { error: roleError.message });
      throw roleError;
    }

    tenantLog.info('Master admin role created successfully');

    // Diagnose → Plan → Apply
    // Diagnose: Subscriptions table does not allow INSERT via RLS
    // Plan: Rely on company defaults (subscription_status, trial_ends_at). Avoid direct inserts.
    // Apply: Skip manual subscription creation to prevent RLS errors
    tenantLog.info('Subscription setup handled by company defaults');

    // Log audit entry
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        company_id: newCompany.id,
        actor_user_id: user.id,
        action: 'onboarding_completed',
        target: 'tenant',
        meta_json: {
          companyName: company.name,
          sector: company.sector,
          country: company.country,
        },
        ip_address: ip,
      });

    if (auditError) {
      tenantLog.warn('Audit log creation failed (non-critical)', { error: auditError.message });
      // Don't fail the request for audit log errors
    } else {
      tenantLog.info('Audit log created');
    }

    const duration = endTimer('onboarding_complete');
    tenantLog.info('Onboarding completed successfully', { durationMs: duration.ms });

    return new Response(
      JSON.stringify({ tenantId: newCompany.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Onboarding failed with exception', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    endTimer('onboarding_failed');
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
