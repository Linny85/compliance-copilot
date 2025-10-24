import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { logEvent } from '../_shared/audit.ts';

interface OnboardingPayload {
  company: {
    legal_name: string;
    country_code: string;
    industry: string;
    headcount_band: string;
    criticality_profile: 'low' | 'med' | 'high';
  };
  orgunits: Array<{ name: string; parent_name?: string }>;
  assets: Array<{ name: string; type: string; criticality: string; owner_id?: string }>;
  processes: Array<{ name: string; criticality?: string; owner_id?: string }>;
  frameworks: string[];
  locale: string;
}

const STARTER_CONTROLS: Record<string, Array<{ code: string; title: string; severity: string }>> = {
  NIS2: [
    { code: 'NIS2-01', title: 'Risk Management Process', severity: 'high' },
    { code: 'NIS2-05', title: 'Incident Management', severity: 'critical' },
    { code: 'NIS2-08', title: 'Backup & Recovery', severity: 'high' },
    { code: 'NIS2-12', title: 'Supplier Security', severity: 'high' },
    { code: 'NIS2-15', title: 'Security Awareness', severity: 'medium' },
  ],
  GDPR: [
    { code: 'GDPR-03', title: 'Record of Processing (VVT)', severity: 'high' },
    { code: 'GDPR-07', title: 'TOMs Defined', severity: 'high' },
    { code: 'GDPR-12', title: 'Data Subject Rights', severity: 'high' },
    { code: 'GDPR-15', title: 'DPIA Procedure', severity: 'high' },
  ],
  AI_ACT: [
    { code: 'AI-01', title: 'AI System Registry', severity: 'medium' },
    { code: 'AI-04', title: 'AI Risk Management', severity: 'high' },
    { code: 'AI-06', title: 'Data Governance', severity: 'high' },
    { code: 'AI-09', title: 'Post-Market Monitoring', severity: 'medium' },
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await sb.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No company found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = profile.company_id;
    const payload: OnboardingPayload = await req.json();

    const stats = {
      orgunits: 0,
      assets: 0,
      processes: 0,
      controls: 0,
      assignments: 0,
      check_rules: 0,
      evidence_requests: 0,
    };

    // 1) Update company details
    await sb.from('Unternehmen').update({
      legal_name: payload.company.legal_name,
      country: payload.company.country_code,
      industry: payload.company.industry,
      headcount_band: payload.company.headcount_band,
      criticality_profile: payload.company.criticality_profile,
    }).eq('id', tenantId);

    // 2) Create OrgUnits (idempotent)
    for (const ou of payload.orgunits) {
      const { data: existing } = await sb
        .from('orgunits')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', ou.name)
        .maybeSingle();

      if (!existing) {
        await sb.from('orgunits').insert({
          tenant_id: tenantId,
          name: ou.name,
        });
        stats.orgunits++;
      }
    }

    // 3) Create Assets
    for (const asset of payload.assets) {
      const { data: existing } = await sb
        .from('assets')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', asset.name)
        .maybeSingle();

      if (!existing) {
        await sb.from('assets').insert({
          tenant_id: tenantId,
          name: asset.name,
          type: asset.type,
          criticality: asset.criticality,
          owner_id: asset.owner_id ?? user.id,
        });
        stats.assets++;
      }
    }

    // 4) Create Processes
    for (const process of payload.processes) {
      const { data: existing } = await sb
        .from('processes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', process.name)
        .maybeSingle();

      if (!existing) {
        await sb.from('processes').insert({
          tenant_id: tenantId,
          name: process.name,
          criticality: process.criticality ?? 'med',
          owner_id: process.owner_id ?? user.id,
        });
        stats.processes++;
      }
    }

    // 5) Activate Frameworks
    for (const fw of payload.frameworks) {
      const { error: fwError } = await sb.from('tenant_frameworks').upsert({
        tenant_id: tenantId,
        framework_code: fw,
      }, { onConflict: 'tenant_id,framework_code' });

      if (fwError && !fwError.message.includes('duplicate')) {
        console.error('[onboarding-seed] Framework insert failed:', fwError);
      }
    }

    // 6) Seed Starter Controls & Assignments
    const { data: orgunits } = await sb.from('orgunits').select('id, name').eq('tenant_id', tenantId);
    const { data: assets } = await sb.from('assets').select('id, name').eq('tenant_id', tenantId);

    for (const fw of payload.frameworks) {
      const starters = STARTER_CONTROLS[fw] ?? [];
      for (const ctrl of starters) {
        // Find or create control
        let { data: existingCtrl } = await sb
          .from('controls')
          .select('id')
          .eq('code', ctrl.code)
          .maybeSingle();

        if (!existingCtrl) {
          const { data: framework } = await sb
            .from('frameworks')
            .select('id')
            .eq('code', fw)
            .maybeSingle();

          if (framework) {
            const { data: newCtrl } = await sb.from('controls').insert({
              code: ctrl.code,
              title: ctrl.title,
              framework_id: framework.id,
              severity: ctrl.severity,
            }).select('id').single();

            existingCtrl = newCtrl;
            stats.controls++;
          }
        }

        if (existingCtrl) {
          // Assign to first OU or asset
          const scopeTarget = orgunits?.[0] || assets?.[0];
          if (scopeTarget) {
            const scopeType = orgunits?.[0] ? 'orgunit' : 'asset';
            const scopeRef = { type: scopeType, id: scopeTarget.id };

            const { error: assignError } = await sb.from('policy_assignments').upsert({
              tenant_id: tenantId,
              control_id: existingCtrl.id,
              scope_ref: scopeRef,
              owner_id: user.id,
              inheritance_rule: 'inherit',
            }, { onConflict: 'tenant_id,control_id,scope_ref' });

            if (!assignError) stats.assignments++;
          }
        }
      }
    }

    // 7) Create first check rule (example: Incident SLA)
    const { data: incidentControl } = await sb
      .from('controls')
      .select('id')
      .eq('code', 'NIS2-05')
      .maybeSingle();

    if (incidentControl) {
      const { data: existingRule } = await sb
        .from('check_rules')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', 'ONBOARDING_INCIDENT_CHECK')
        .maybeSingle();

      if (!existingRule) {
        const { data: newRule } = await sb.from('check_rules').insert({
          tenant_id: tenantId,
          control_id: incidentControl.id,
          code: 'ONBOARDING_INCIDENT_CHECK',
          title: 'Incident SLA Defined',
          kind: 'static',
          spec: { operator: 'exists', path: 'incident_sla' },
          severity: 'high',
          enabled: true,
          created_by: user.id,
        }).select('id').single();

        if (newRule) stats.check_rules++;
      }
    }

    // 8) Create evidence request for Backup control
    const { data: backupControl } = await sb
      .from('controls')
      .select('id')
      .eq('code', 'NIS2-08')
      .maybeSingle();

    if (backupControl) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 7);

      const { data: existingReq } = await sb
        .from('evidence_requests')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('control_id', backupControl.id)
        .eq('status', 'open')
        .maybeSingle();

      if (!existingReq) {
        await sb.from('evidence_requests').insert({
          tenant_id: tenantId,
          control_id: backupControl.id,
          title: 'Upload Backup Policy Document',
          description: 'Please provide evidence of your backup and recovery procedures.',
          requested_by: user.id,
          status: 'open',
          due_at: dueAt.toISOString(),
        });
        stats.evidence_requests++;
      }
    }

    // 9) Update onboarding progress
    await sb.from('Unternehmen').update({
      onboarding_progress: 100,
    }).eq('id', tenantId);

    // 10) Audit log
    await logEvent(sb, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: 'onboarding.seed.completed',
      entity: 'tenant',
      entity_id: tenantId,
      payload: {
        frameworks: payload.frameworks,
        stats,
      },
    });

    return new Response(JSON.stringify({ ok: true, created: stats }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[onboarding-seed]', error);
    return new Response(
      JSON.stringify({ error: 'seed_failed', details: String(error?.message ?? error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
