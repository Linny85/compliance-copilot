import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseWithAuth } from "../_shared/auth.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_BASIC = Deno.env.get("STRIPE_PRICE_BASIC")!;

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
  const { user } = auth;

  try {
    const { customerId, success_url, cancel_url, plan = 'basic' } = await req.json();
    const origin = new URL(req.url).origin;

    console.log("[Checkout] Creating session for customer:", customerId);

    // Create Stripe checkout session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': STRIPE_PRICE_BASIC,
        'line_items[0][quantity]': '1',
        'payment_method_types[0]': 'card',
        success_url: success_url || `${origin}/billing?status=success`,
        cancel_url: cancel_url || `${origin}/billing?status=cancel`,
        allow_promotion_codes: 'true',
        'metadata[plan]': plan,
        'subscription_data[trial_period_days]': '14',
        'subscription_data[metadata][user_id]': user.id,
        ...(customerId ? { customer: customerId } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Checkout] Stripe API error:", error);
      throw new Error(`Stripe API error: ${error}`);
    }

    const session = await response.json();
    console.log("[Checkout] Session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[Checkout] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Checkout failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
});
