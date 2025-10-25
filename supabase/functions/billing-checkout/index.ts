import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_BASIC = Deno.env.get("STRIPE_PRICE_BASIC")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { customerId, success_url, cancel_url, plan = 'basic' } = await req.json();
    const origin = new URL(req.url).origin;

    console.log("[Checkout] Creating session for customer:", customerId);

    // Create Stripe checkout session using Fetch API
    const sessionData: any = {
      mode: 'subscription',
      line_items: [
        {
          price: STRIPE_PRICE_BASIC,
          quantity: 1,
        },
      ],
      payment_method_types: ['card'],
      success_url: success_url || `${origin}/billing?status=success`,
      cancel_url: cancel_url || `${origin}/billing?status=cancel`,
      allow_promotion_codes: true,
      metadata: {
        plan: plan,
      },
    };

    if (customerId) {
      sessionData.customer = customerId;
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(
        Object.entries({
          mode: sessionData.mode,
          'line_items[0][price]': sessionData.line_items[0].price,
          'line_items[0][quantity]': sessionData.line_items[0].quantity.toString(),
          'payment_method_types[0]': sessionData.payment_method_types[0],
          success_url: sessionData.success_url,
          cancel_url: sessionData.cancel_url,
          allow_promotion_codes: sessionData.allow_promotion_codes.toString(),
          'metadata[plan]': sessionData.metadata.plan,
          ...(customerId ? { customer: customerId } : {}),
        })
      ),
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
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("[Checkout] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Checkout failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
