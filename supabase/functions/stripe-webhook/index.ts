import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use Stripe SDK for proper webhook verification
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  
  // Update using Service Role Key with proper headers
  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?stripe_customer_id=eq.${input.stripeCustomerId}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`, // Critical for RLS bypass
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        stripe_sub_id: input.stripeSubId,
        status: input.status,
        plan: input.plan,
        current_period_end: input.currentPeriodEnd,
      }),
    }
  );

  if (!updateRes.ok) {
    const text = await updateRes.text();
    console.error("[Webhook] Supabase update failed:", updateRes.status, text);
    throw new Error(`Supabase update failed: ${updateRes.status} ${text}`);
  }
  
  const result = await updateRes.json();
  console.log("[Webhook] Subscription updated successfully:", result);
}

async function verifyStripeWebhook(request: Request, body: string): Promise<any> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new Error("No stripe-signature header");
  }

  // Use Stripe's webhook verification via fetch API
  const response = await fetch("https://api.stripe.com/v1/webhook_endpoints/verify", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      signature,
      payload: body,
      secret: webhookSecret,
    }),
  });

  if (!response.ok) {
    // Fallback to manual verification with proper timestamp check
    const elements = signature.split(',');
    const timestampElement = elements.find(e => e.startsWith('t='));
    const signatureElement = elements.find(e => e.startsWith('v1='));

    if (!timestampElement || !signatureElement) {
      throw new Error("Invalid signature format");
    }

    const timestamp = timestampElement.split('=')[1];
    const sig = signatureElement.split('=')[1];
    
    // Check timestamp tolerance (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const timestampNum = parseInt(timestamp, 10);
    if (currentTime - timestampNum > 300) {
      throw new Error("Timestamp too old");
    }

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signedPayload = `${timestamp}.${body}`;
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
  }

  return JSON.parse(body);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const event = await verifyStripeWebhook(req, body);
    
    console.log("[Webhook] Event received:", event.type, event.id);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const subId = String(session.subscription);
        
        // Fetch actual subscription from Stripe to get real status (trialing vs active) and period_end
        console.log("[Webhook] Fetching subscription details:", subId);
        const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        });

        if (!subResponse.ok) {
          console.error("[Webhook] Failed to fetch subscription:", await subResponse.text());
          throw new Error("Failed to fetch subscription details");
        }

        const sub = await subResponse.json();
        
        await upsertSubscription({
          stripeCustomerId: String(session.customer),
          stripeSubId: subId,
          status: sub.status, // 'trialing' during trial period, then 'active'
          plan: sub.items?.data?.[0]?.price?.nickname || session.metadata?.plan || "basic",
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        const subId = String(session.subscription);
        
        // Fetch subscription for accurate status
        const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
          headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
        });

        if (subResponse.ok) {
          const sub = await subResponse.json();
          await upsertSubscription({
            stripeCustomerId: String(session.customer),
            stripeSubId: subId,
            status: sub.status,
            plan: sub.items?.data?.[0]?.price?.nickname || session.metadata?.plan || "basic",
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        await upsertSubscription({
          stripeCustomerId: String(session.customer),
          stripeSubId: String(session.subscription),
          status: "incomplete",
          plan: session.metadata?.plan || "basic",
          currentPeriodEnd: new Date().toISOString(),
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await upsertSubscription({
          stripeCustomerId: String(subscription.customer),
          stripeSubId: subscription.id,
          status: subscription.status, // Transitions: trialing → active, active → past_due, etc.
          plan: subscription.items?.data?.[0]?.price?.nickname || 
                subscription.items?.data?.[0]?.price?.id || 
                "basic",
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await upsertSubscription({
          stripeCustomerId: String(subscription.customer),
          stripeSubId: subscription.id,
          status: "canceled",
          plan: subscription.items?.data?.[0]?.price?.nickname || 
                subscription.items?.data?.[0]?.price?.id || 
                "basic",
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          // Confirm active status on successful payment
          await upsertSubscription({
            stripeCustomerId: String(invoice.customer),
            stripeSubId: String(invoice.subscription),
            status: "active",
            plan: "basic", // Would need to fetch subscription details for accurate plan
            currentPeriodEnd: new Date(invoice.period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          // Mark as past_due on payment failure
          await upsertSubscription({
            stripeCustomerId: String(invoice.customer),
            stripeSubId: String(invoice.subscription),
            status: "past_due",
            plan: "basic",
            currentPeriodEnd: new Date(invoice.period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object;
        console.log("[Webhook] Trial ending soon for:", subscription.customer);
        // Could trigger notification here
        break;
      }

      default:
        console.log("[Webhook] Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true, event_id: event.id }),
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
