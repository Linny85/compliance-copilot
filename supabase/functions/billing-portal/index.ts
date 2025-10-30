import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseWithAuth } from "../_shared/auth.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { status: 405, headers: corsHeaders }
    );
  }

  // Auth prüfen
  const auth = await getSupabaseWithAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const { customerId, return_url } = await req.json();
    const origin = new URL(req.url).origin;

    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    console.log("[Portal] Creating session for customer:", customerId);

    // Create Stripe billing portal session
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: return_url || `${origin}/billing`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Portal] Stripe API error:", error);
      throw new Error(`Stripe API error: ${error}`);
    }

    const session = await response.json();
    console.log("[Portal] Session created");

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[Portal] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Portal creation failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
});
