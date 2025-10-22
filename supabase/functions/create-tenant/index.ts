import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a company
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile?.company_id) {
      console.log('User already has company'); // GDPR-friendly: avoid PII in logs
      return new Response(
        JSON.stringify({ error: 'User already has a company' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: OnboardingRequest = await req.json();
    const { company, masterCode, deleteCode } = body;

    // Diagnose → Plan → Apply
    // Diagnose: Ensure input meets API contract while keeping backward compatibility with legacy fields
    // Plan: Require name, country, sector, codes, and either address OR (street + zip + city)
    // Apply: Validate and 400 on failure
    const hasFullAddress = Boolean((company.address && company.address.trim()) ||
      (company.street && company.street.trim() && company.zip && company.zip.trim() && company.city && company.city.trim()));

    if (!company.name?.trim() || !company.country?.trim() || !company.sector?.trim() ||
        !masterCode?.trim() || !deleteCode?.trim() || !hasFullAddress) {
      return new Response(
        JSON.stringify({ error: 'Invalid input. Please provide required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash codes server-side
    const masterCodeHash = await hashCode(masterCode);
    const deleteCodeHash = await hashCode(deleteCode);

    console.log('Creating company for user:', user.id);

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
      console.error('Company creation error:', companyError);
      throw companyError;
    }

    console.log('Company created:', newCompany.id);

    // Update user profile with company_id
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        company_id: newCompany.id,
        email: user.email!,
        full_name: company.name,
      });

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw profileError;
    }

    console.log('Profile updated with company_id');

    // Create master_admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        company_id: newCompany.id,
        role: 'master_admin',
      });

    if (roleError) {
      console.error('Role creation error:', roleError);
      throw roleError;
    }

    console.log('Master admin role created');

    // Diagnose → Plan → Apply
    // Diagnose: Subscriptions table does not allow INSERT via RLS
    // Plan: Rely on company defaults (subscription_status, trial_ends_at). Avoid direct inserts.
    // Apply: Skip manual subscription creation to prevent RLS errors
    console.log('Subscription setup handled by company defaults');

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
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't fail the request for audit log errors
    }

    console.log('Onboarding completed successfully');

    return new Response(
      JSON.stringify({ tenantId: newCompany.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Onboarding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
