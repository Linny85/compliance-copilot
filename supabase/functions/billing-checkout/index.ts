import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, ok, bad } from "../_shared/cors.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_BASIC = Deno.env.get("STRIPE_PRICE_BASIC")!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return cors(new Response(null, { status: 204 }));
  }

  if (req.method !== 'POST') {
    return bad(405, 'Method not allowed');
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return bad(401, "Unauthorized");
    }

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
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': STRIPE_PRICE_BASIC,
        'line_items[0][quantity]': '1',
        'payment_method_types[0]': 'card',
        success_url: success_url || `${origin}/billing?status=success`,
        cancel_url: cancel_url || `${origin}/billing?status=cancel`,
        allow_promotion_codes: 'true',
        'metadata[plan]': plan,
        // 14-day trial period
        'subscription_data[trial_period_days]': '14',
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

    return ok({ url: session.url });
  } catch (error) {
    console.error("[Checkout] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Checkout failed';
    return bad(500, errorMessage);
  }
});
