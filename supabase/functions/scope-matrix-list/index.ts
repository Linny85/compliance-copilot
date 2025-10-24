import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tenantId = profile.company_id;
    const url = new URL(req.url);
    const scopeType = url.searchParams.get('scope_type') ?? '';
    const scopeId = url.searchParams.get('scope_id') ?? '';
    const framework = url.searchParams.get('framework') ?? '';
    const search = url.searchParams.get('search') ?? '';
    const onlyConflicts = url.searchParams.get('only_conflicts') === 'true';

    // Build query for effective controls
    let query = supabaseClient
      .from('v_effective_controls')
      .select(`
        *,
        controls:control_id (
          id, code, title, framework_id,
          frameworks:framework_id (code, title)
        ),
        profiles:owner_id (id, full_name)
      `)
      .eq('tenant_id', tenantId);

    if (scopeType && scopeId) {
      query = query.eq('scope_type', scopeType).eq('scope_id', scopeId);
    }

    const { data: effectiveControls, error: effectiveError } = await query;

    if (effectiveError) {
      console.error('[scope-matrix-list] Error fetching effective controls:', effectiveError);
      return new Response(JSON.stringify({ error: effectiveError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get conflicts if needed
    let conflicts = [];
    if (onlyConflicts || true) { // Always fetch for badge display
      const conflictsQuery = supabaseClient
        .from('v_scope_conflicts')
        .select('*')
        .eq('tenant_id', tenantId);

      if (scopeType && scopeId) {
        conflictsQuery.eq('scope_type', scopeType).eq('scope_id', scopeId);
      }

      const { data: conflictsData } = await conflictsQuery;
      conflicts = conflictsData ?? [];
    }

    // Build conflict map for fast lookup
    const conflictMap = new Map();
    conflicts.forEach(c => {
      const key = `${c.control_id}-${c.scope_type}-${c.scope_id}`;
      conflictMap.set(key, c);
    });

    // Enrich controls with conflict info
    let items = (effectiveControls ?? []).map(item => {
      const key = `${item.control_id}-${item.scope_type}-${item.scope_id}`;
      const conflict = conflictMap.get(key);
      
      return {
        ...item,
        has_conflict: !!conflict,
        conflict_kind: conflict?.conflict_kind ?? null,
        conflict_count: conflict?.cnt ?? 0
      };
    });

    // Filter by framework if specified
    if (framework) {
      items = items.filter(item => 
        item.controls?.frameworks?.code === framework
      );
    }

    // Filter by search if specified
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item =>
        item.controls?.code?.toLowerCase().includes(searchLower) ||
        item.controls?.title?.toLowerCase().includes(searchLower)
      );
    }

    // Filter only conflicts if requested
    if (onlyConflicts) {
      items = items.filter(item => item.has_conflict);
    }

    return new Response(JSON.stringify({ items, conflicts }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[scope-matrix-list] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
