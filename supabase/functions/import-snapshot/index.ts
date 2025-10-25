import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Snapshot {
  version: number;
  companies: any[];
  vendors: any[];
  aiSystems: any[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, snapshot, userId, collection, record, id } = body;

    if (action === 'import') {
      if (!snapshot || snapshot.version !== 1) {
        return new Response(JSON.stringify({ error: 'Invalid snapshot' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tenantId = user.id;
      const imported = {
        companies: 0,
        vendors: 0,
        aiSystems: 0,
      };

      // Import companies
      for (const company of snapshot.companies) {
        const { error } = await supabase
          .from('demo_companies')
          .upsert({ ...company, tenant_id: tenantId });
        if (!error) imported.companies++;
      }

      // Import vendors
      for (const vendor of snapshot.vendors) {
        const { error } = await supabase
          .from('demo_vendors')
          .upsert({ ...vendor, tenant_id: tenantId });
        if (!error) imported.vendors++;
      }

      // Import AI systems
      for (const aiSystem of snapshot.aiSystems) {
        const { error } = await supabase
          .from('demo_ai_systems')
          .upsert({ ...aiSystem, tenant_id: tenantId });
        if (!error) imported.aiSystems++;
      }

      return new Response(JSON.stringify({ imported }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get') {
      const tenantId = userId || user.id;
      
      const [companiesRes, vendorsRes, aiSystemsRes] = await Promise.all([
        supabase.from('demo_companies').select('*').eq('tenant_id', tenantId),
        supabase.from('demo_vendors').select('*').eq('tenant_id', tenantId),
        supabase.from('demo_ai_systems').select('*').eq('tenant_id', tenantId),
      ]);

      const result: Snapshot = {
        version: 1,
        companies: companiesRes.data || [],
        vendors: vendorsRes.data || [],
        aiSystems: aiSystemsRes.data || [],
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Import snapshot error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
