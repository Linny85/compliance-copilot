import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminSecret = Deno.env.get("I18N_ADMIN_SECRET")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function isAuthorized(req: Request) {
  const hdr = req.headers.get("x-admin-secret") || req.headers.get("authorization")?.replace(/^Bearer /i, "");
  return hdr === adminSecret;
}

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

type UpsertPayload = {
  tenant_id?: string | null;
  namespace: string;
  tkey: string;
  locale: string;
  text: string;
  approved?: boolean;
  version?: number;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { 
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.toLowerCase();

  try {
    if (req.method === "POST" && path.endsWith("/i18n-admin/upsert")) {
      const body = (await req.json()) as UpsertPayload;
      if (!body.namespace || !body.tkey || !body.locale || !body.text) {
        return new Response(JSON.stringify({ error: "Missing fields" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const res = await sb("translations", {
        method: "POST",
        body: JSON.stringify([{ ...body }]),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: await res.text() }), { 
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const json = await res.json();
      return new Response(JSON.stringify({ ok: true, data: json }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === "POST" && path.endsWith("/i18n-admin/approve")) {
      const { id, approved } = await req.json();
      if (!id || typeof approved !== "boolean") {
        return new Response(JSON.stringify({ error: "Bad request" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const res = await sb(`translations?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ approved, approved_at: new Date().toISOString() }),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: await res.text() }), { 
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const json = await res.json();
      return new Response(JSON.stringify({ ok: true, data: json }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === "GET" && path.endsWith("/i18n-admin/list")) {
      const q = url.searchParams;
      const ns = q.get("namespace") ?? "ui";
      const loc = q.get("locale") ?? "de";
      const tenant = q.get("tenant_id");
      const params = new URLSearchParams({
        select: "*",
        namespace: `eq.${ns}`,
        locale: `eq.${loc}`,
      });
      const route = tenant 
        ? `translations?${params.toString()}&tenant_id=eq.${tenant}`
        : `translations?${params.toString()}&tenant_id=is.null`;
      const res = await sb(route);
      const json = await res.json();
      return new Response(JSON.stringify({ ok: true, data: json }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { 
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error("Error in i18n-admin:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
