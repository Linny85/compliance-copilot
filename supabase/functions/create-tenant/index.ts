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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Client for auth verification (with user token)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    log.info('Verifying authentication');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
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

    // Idempotency check: Does user already have a company?
    userLog.info('Checking for existing company by erstellt_von');
    const { data: existingCompany } = await supabaseAdmin
      .from('Unternehmen')
      .select('id')
      .eq('erstellt_von', user.id)
      .maybeSingle();

    if (existingCompany?.id) {
      userLog.info('User already has a company - idempotent success', { companyId: existingCompany.id });
      return new Response(
        JSON.stringify({ tenantId: existingCompany.id, existed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userLog.info('Parsing request body');
    const body: OnboardingRequest = await req.json();
    const { company, masterCode, deleteCode } = body;

    // Normalize address from legacy fields if needed
    let normalizedAddress = company.address?.trim() || '';
    if (!normalizedAddress && company.street && company.zip && company.city) {
      normalizedAddress = `${company.street.trim()}, ${company.zip.trim()} ${company.city.trim()}`;
      userLog.info('Normalized address from legacy fields');
    }

    // Normalize sector: "Sonstiges"/"Other" → "other"
    let normalizedSector = company.sector?.trim().toLowerCase();
    if (normalizedSector === 'sonstiges') {
      normalizedSector = 'other';
    }

    userLog.info('Request body structure', { 
      hasName: !!company.name,
      hasCountry: !!company.country,
      hasSector: !!normalizedSector,
      hasAddress: !!normalizedAddress,
      hasMasterCode: !!masterCode,
      hasDeleteCode: !!deleteCode,
    });

    // Validate required fields
    if (!company.name?.trim() || !company.country?.trim() || !normalizedSector ||
        !masterCode?.trim() || !deleteCode?.trim() || !normalizedAddress) {
      userLog.error('Invalid input - missing required fields', {
        hasName: !!company.name?.trim(),
        hasCountry: !!company.country?.trim(),
        hasSector: !!normalizedSector,
        hasMasterCode: !!masterCode?.trim(),
        hasDeleteCode: !!deleteCode?.trim(),
        hasAddress: !!normalizedAddress,
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

    userLog.info('Starting database transaction');
    
    // Execute all database operations in a transaction using admin client
    let newCompany: any;
    let tenantLog: Logger;
    
    try {
      // Create company (using admin client to bypass RLS)
      userLog.info('Creating company');
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from('Unternehmen')
        .insert({
          name: company.name.trim(),
          legal_name: company.legalName?.trim(),
          address: normalizedAddress,
          street: company.street?.trim(),
          zip: company.zip?.trim(),
          city: company.city?.trim(),
          country: company.country.trim(),
          sector: normalizedSector,
          website: company.website?.trim(),
          vat_id: company.vatId?.trim(),
          company_size: company.companySize?.trim(),
          master_code_hash: masterCodeHash,
          delete_code_hash: deleteCodeHash,
          erstellt_von: user.id,
        })
        .select()
        .single();

      if (companyError) {
        userLog.error('Company creation failed', { error: companyError.message, code: companyError.code });
        
        const errorMsg = String(companyError.message || companyError);
        
        // Idempotency: Handle duplicate key / conflict errors
        if (/duplicate key|unique|already exists|conflict|23505/i.test(errorMsg) || companyError.code === '23505') {
          userLog.info('Duplicate detected - attempting to fetch existing company');
          
          // Try to fetch the existing company by erstellt_von
          const { data: existingAgain } = await supabaseAdmin
            .from('Unternehmen')
            .select('id')
            .eq('erstellt_von', user.id)
            .maybeSingle();
          
          if (existingAgain?.id) {
            userLog.info('Found existing company after conflict - idempotent success', { companyId: existingAgain.id });
            return new Response(
              JSON.stringify({ tenantId: existingAgain.id, existed: true }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // If we still can't find it, check if it's a master_code duplicate (different owner)
          if (errorMsg.includes('master_code')) {
            userLog.error('Master code already in use by another company');
            return new Response(
              JSON.stringify({ error: 'Master code already in use', detail: 'This master code is already registered to another company' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        throw companyError;
      }

      newCompany = companyData;
      const tenantId = newCompany.id;
      tenantLog = createLogger(req, { reqId, path: new URL(req.url).pathname, method: req.method, ip, userId: user.id, tenantId });
      
      tenantLog.info('Company created successfully');

      // Update user profile with company_id
      tenantLog.info('Updating user profile');
      const { error: profileError } = await supabaseAdmin
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
      const { error: roleError } = await supabaseAdmin
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

      // Subscription setup handled by company defaults
      tenantLog.info('Subscription setup handled by company defaults');

      // Log audit entry
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          company_id: newCompany.id,
          actor_user_id: user.id,
          action: 'onboarding_completed',
          target: 'tenant',
          meta_json: {
            companyName: company.name,
            sector: normalizedSector,
            country: company.country,
          },
          ip_address: ip,
        });

      if (auditError) {
        tenantLog.warn('Audit log creation failed (non-critical)', { error: auditError.message });
      } else {
        tenantLog.info('Audit log created');
      }
    } catch (txError: any) {
      userLog.error('Transaction failed, rolling back', { 
        error: txError instanceof Error ? txError.message : String(txError),
        code: txError?.code,
        details: txError?.details,
      });
      
      // Determine appropriate status code based on error type
      const errorMsg = String(txError?.message || txError || '');
      const errorCode = txError?.code || '';
      
      let status = 500;
      let errorResponse = { error: 'Transaction failed', detail: errorMsg };
      
      // RLS/Policy violations
      if (/policy|rls|not allowed|permission denied/i.test(errorMsg) || errorCode === '42501') {
        status = 403;
        errorResponse = { error: 'Permission denied', detail: 'RLS policy violation or insufficient permissions' };
      }
      // Constraint violations (duplicate, foreign key, etc.)
      else if (/duplicate|constraint|unique|foreign key/i.test(errorMsg) || errorCode.startsWith('23')) {
        status = 409;
        errorResponse = { error: 'Conflict', detail: 'A record with this data already exists or violates constraints' };
      }
      // Invalid data
      else if (/invalid|check|type|value/i.test(errorMsg) || errorCode === '22P02') {
        status = 400;
        errorResponse = { error: 'Invalid data', detail: errorMsg };
      }
      
      userLog.error('Transaction error classified', { status, errorCode });
      endTimer('onboarding_failed');
      
      return new Response(
        JSON.stringify(errorResponse),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = endTimer('onboarding_complete');
    tenantLog.info('Onboarding completed successfully', { durationMs: duration.ms });

    return new Response(
      JSON.stringify({ tenantId: newCompany.id, existed: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    log.error('Onboarding failed with exception', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: error?.code,
    });
    endTimer('onboarding_failed');
    
    // Classify top-level errors
    const errorMsg = String(error?.message || error || 'Internal server error');
    const errorCode = error?.code || '';
    
    let status = 500;
    let errorResponse = { error: 'Internal server error', detail: errorMsg };
    
    // Authentication errors
    if (/unauthorized|auth|token/i.test(errorMsg) || errorCode === 'PGRST301') {
      status = 401;
      errorResponse = { error: 'Unauthorized', detail: 'Authentication failed or token invalid' };
    }
    // RLS/Policy violations
    else if (/policy|rls|not allowed|permission denied/i.test(errorMsg) || errorCode === '42501') {
      status = 403;
      errorResponse = { error: 'Permission denied', detail: 'Insufficient permissions' };
    }
    // Validation errors
    else if (/invalid|validation|required/i.test(errorMsg)) {
      status = 400;
      errorResponse = { error: 'Invalid input', detail: errorMsg };
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
