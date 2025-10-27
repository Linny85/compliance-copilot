import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import rules from config
const rulesUrl = new URL("../../config/scope_rules.v1.json", import.meta.url);
const rulesText = await Deno.readTextFile(rulesUrl);
const rules = JSON.parse(rulesText);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Input = {
  sector: 'health'|'pharmacy'|'dentistry'|'lab'|'hospital'|'ehealth_it'|'other';
  is_ti_connected: boolean;
  employees?: number;
  turnover?: number;  // EUR
  balance?: number;   // EUR
  uses_ai_for_work: boolean;
  ai_role?: 'provider'|'deployer'|'none';
};

function inList<T>(val: T, list: T[]) { return list.includes(val); }

function evalExpr(expr: string, ctx: Input): boolean {
  const { sector, is_ti_connected, employees=0, turnover=0, balance=0, uses_ai_for_work, ai_role } = ctx;
  switch (expr) {
    case "is_ti_connected == true":
      return !!is_ti_connected;
    case "sector in ['health','pharmacy','dentistry','lab','hospital','ehealth_it'] && (employees >= 50 || turnover >= 10000000 || balance >= 10000000)":
      return inList(sector, ['health','pharmacy','dentistry','lab','hospital','ehealth_it']) &&
        ((employees ?? 0) >= 50 || (turnover ?? 0) >= 10_000_000 || (balance ?? 0) >= 10_000_000);
    case "sector in ['health','pharmacy','dentistry','lab','hospital','ehealth_it'] && !(employees >= 50 || turnover >= 10000000 || balance >= 10000000)":
      return inList(sector, ['health','pharmacy','dentistry','lab','hospital','ehealth_it']) &&
        !((employees ?? 0) >= 50 || (turnover ?? 0) >= 10_000_000 || (balance ?? 0) >= 10_000_000);
    case "uses_ai_for_work == true":
      return !!uses_ai_for_work;
    case "ai_role == 'provider'":
      return ai_role === 'provider';
    case "ai_role == 'deployer'":
      return ai_role === 'deployer';
    default:
      return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error('Auth error:', userErr);
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const body: { tenant_id: string; input: Input } = await req.json();
    console.log('Analyzing tenant:', body.tenant_id, 'Input:', body.input);

    const results: Record<string, unknown> = {};
    const obligations: Record<string, string[]> = {};

    for (const [key, rule] of Object.entries(rules.rules)) {
      const r: any = rule;
      if (evalExpr(r.if, body.input)) {
        console.log('Rule matched:', key, r.title);
        Object.assign(results, r.result ?? {});
        if (r.obligations) obligations[key] = r.obligations;
      }
    }

    console.log('Analysis results:', results);
    console.log('Obligations:', obligations);

    const { data, error } = await supabase
      .from('tenant_analysis')
      .insert({
        tenant_id: body.tenant_id,
        created_by: user.id,
        input: body.input as unknown as Record<string, unknown>,
        result: { ...results, obligations },
        rules_version: (rules as any).version ?? 1
      })
      .select('*')
      .single();

    if (error) {
      console.error('DB insert error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Analysis saved successfully:', data.id);
    return new Response(
      JSON.stringify({ analysis: data }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
