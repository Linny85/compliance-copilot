import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log('[scheduler] Starting scheduled check runs')

    // Fetch all active tenants
    const { data: tenants, error: tenantsError } = await sb
      .from('Unternehmen')
      .select('id')

    if (tenantsError) {
      console.error('[scheduler:error] Failed to fetch tenants:', tenantsError)
      throw tenantsError
    }

    if (!tenants || tenants.length === 0) {
      console.log('[scheduler] No tenants found')
      return new Response(
        JSON.stringify({ executed: 0, errors: 0, message: 'No tenants found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let executed = 0
    let errors = 0

    // Iterate through all tenants and execute checks for each period
    for (const tenant of tenants) {
      for (const period of ['hourly', 'daily', 'weekly'] as const) {
        try {
          console.log(`[scheduler] Executing ${period} checks for tenant ${tenant.id}`)

          const { error: invokeError } = await sb.functions.invoke('run-checks', {
            body: { period },
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          })

          if (invokeError) {
            console.error(`[scheduler:error] ${tenant.id} ${period}:`, invokeError)
            errors++
          } else {
            console.log(`[scheduler] ✓ Executed ${period} for tenant ${tenant.id}`)
            executed++
          }
        } catch (err) {
          console.error(`[scheduler:error] ${tenant.id} ${period}:`, err)
          errors++
        }
      }
    }

    console.log(`[scheduler] Completed: ${executed} successful, ${errors} errors`)

    return new Response(
      JSON.stringify({
        executed,
        errors,
        tenants: tenants.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[scheduler:error] Fatal error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
