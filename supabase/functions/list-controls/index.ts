import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Parse query parameters
    const url = new URL(req.url);
    const frameworkCode = url.searchParams.get('framework');
    const severity = url.searchParams.get('severity');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

    console.log('[list-controls] Query params:', { frameworkCode, severity, page, pageSize });

    // Build query
    let query = supabase
      .from('controls')
      .select(`
        *,
        framework:frameworks(code, title, version)
      `, { count: 'exact' });

    // Filter by framework if provided
    if (frameworkCode) {
      const { data: framework } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', frameworkCode)
        .maybeSingle();
      
      if (framework) {
        query = query.eq('framework_id', framework.id);
      }
    }

    // Filter by severity if provided
    if (severity) {
      query = query.eq('severity', severity);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query.order('code');

    if (error) {
      console.error('[list-controls] Query error:', error);
      throw error;
    }

    console.log('[list-controls] Success:', { count, returned: data?.length });

    return new Response(
      JSON.stringify({
        controls: data,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[list-controls] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
