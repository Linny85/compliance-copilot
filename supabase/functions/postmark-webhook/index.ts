import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("POSTMARK_WEBHOOK_SECRET")!;

async function sb(path: string, init?: RequestInit) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=representation",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

function findQueueId(payload: any): string | null {
  const candidates: Array<{ Name?: string; Value?: string }> =
    payload?.Headers ?? payload?.MessageHeaders ?? payload?.CustomHeaders ?? [];
  for (const h of candidates) {
    if ((h?.Name || "").toLowerCase() === "x-queue-id" && h?.Value) return h.Value;
  }
  const meta = payload?.Metadata;
  if (meta && typeof meta["X-Queue-Id"] === "string") return meta["X-Queue-Id"];
  return null;
}

function mapEventName(pm: any): string {
  const t = (pm?.RecordType || pm?.Type || "").toLowerCase();
  switch (t) {
    case "delivery":        return "webhook:delivered";
    case "open":            return "webhook:open";
    case "click":           return "webhook:click";
    case "bounce":          return "webhook:bounce";
    case "spamcomplaint":   return "webhook:spam";
    case "subscriptionchange": return "webhook:subscription";
    default:                return `webhook:${t || "unknown"}`;
  }
}

async function updateQueueOnDelivery(queueId: string) {
  await sb(`email_events`, { 
    method: "POST", 
    body: JSON.stringify({
      queue_id: queueId, 
      event: "delivered", 
      meta: {}
    })
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });

  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== webhookSecret) {
    return new Response("Forbidden", { status: 403 });
  }

  const payload = await req.json().catch(() => ({}));
  const queueId = findQueueId(payload);
  const event = mapEventName(payload);

  console.log(`[postmark-webhook] ${event} for queue ${queueId || "unknown"}`);

  await sb(`email_events`, {
    method: "POST",
    body: JSON.stringify({
      queue_id: queueId,
      event,
      meta: payload,
    }),
  });

  if (event === "webhook:delivered" && queueId) {
    await updateQueueOnDelivery(queueId);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
