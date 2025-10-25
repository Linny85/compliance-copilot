import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

interface SubscriptionUpdate {
  stripeCustomerId: string;
  stripeSubId: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
}

async function upsertSubscription(input: SubscriptionUpdate) {
  console.log("[Webhook] Updating subscription:", input);
  
  // Find user by stripe_customer_id
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${input.stripeCustomerId}&select=id,user_id,company_id`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  
  const existing = await findRes.json();
  
  if (!existing || existing.length === 0) {
    console.warn("[Webhook] No subscription found for customer:", input.stripeCustomerId);
    return;
  }

  const sub = existing[0];
  
  // Update subscription
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${sub.id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        stripe_customer_id: input.stripeCustomerId,
        stripe_sub_id: input.stripeSubId,
        status: input.status,
        plan: input.plan,
        current_period_end: input.currentPeriodEnd,
      }),
    }
  );

  if (!updateRes.ok) {
    const text = await updateRes.text();
    throw new Error(`Supabase update failed: ${updateRes.status} ${text}`);
  }
  
  console.log("[Webhook] Subscription updated successfully");
}

async function verifyStripeSignature(request: Request, body: string): Promise<any> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new Error("No signature provided");
  }

  // Parse signature
  const elements = signature.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
  const sig = elements.find(e => e.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !sig) {
    throw new Error("Invalid signature format");
  }

  // Create signed payload
  const signedPayload = `${timestamp}.${body}`;
  
  // Verify signature using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = new Uint8Array(sig.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(signedPayload)
  );

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  return JSON.parse(body);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const event = await verifyStripeSignature(req, body);
    
    console.log("[Webhook] Received event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await upsertSubscription({
          stripeCustomerId: String(session.customer),
          stripeSubId: String(session.subscription),
          status: "active",
          plan: session.metadata?.plan || "basic",
          currentPeriodEnd: new Date().toISOString(),
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await upsertSubscription({
          stripeCustomerId: String(subscription.customer),
          stripeSubId: subscription.id,
          status: subscription.status,
          plan: subscription.items?.data?.[0]?.price?.nickname || 
                subscription.items?.data?.[0]?.price?.id || 
                "basic",
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      default:
        console.log("[Webhook] Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[Webhook] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
