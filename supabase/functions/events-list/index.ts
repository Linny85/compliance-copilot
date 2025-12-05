import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, json as jsonResponse } from "../_shared/cors.ts";
import { assertOrigin, requireUserAndTenant } from "../_shared/access.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200, req?: Request) {
  return jsonResponse(body, status, req);
}

Deno.serve(async (req) => {
  const originCheck = assertOrigin(req);
  if (originCheck) return originCheck;
  const cors = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "GET") {
    return json({ error: "Method Not Allowed" }, 405, req);
  }

  const access = requireUserAndTenant(req);
  if (access instanceof Response) return access;
  const { tenantId } = access;

  try {
    const { data, error } = await sbAdmin
      .from("email_events")
      .select("id, occurred_at, event_type, email, message_id")
      .eq("tenant_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return json({ data }, 200, req);
  } catch (error: any) {
    console.error("[events-list] Error:", error);
    return json({ error: error.message ?? "Internal error" }, 500, req);
  }
});
