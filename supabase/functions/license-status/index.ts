import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, json } from "../_shared/cors.ts";
import { assertOrigin, extractOriginHost, requireUserAndTenant } from "../_shared/access.ts";
import { getLicenseStatus } from "../_shared/license.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: cors });
  }

  if (req.method !== "GET") {
    return json({ ok: false, error: "Method Not Allowed" }, 405, req);
  }

  const originCheck = assertOrigin(req);
  if (originCheck) return originCheck;

  const access = requireUserAndTenant(req);
  if (access instanceof Response) return access;
  const { tenantId } = access;

  try {
    const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const originHost = extractOriginHost(req);
    const license = await getLicenseStatus(client, tenantId, { originHost });
    const ok = license.tier !== "none" && license.isActive;

    return json({ ok, tenantId, license }, 200, req);
  } catch (error: unknown) {
    console.error("[license-status] failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({
      ok: false,
      tenantId,
      license: {
        tier: "none",
        isActive: false,
        isTrial: false,
        expiresAt: null,
        blockedReason: "no_license",
        allowedOrigins: [],
        maxUsers: null,
        notes: null,
      },
      error: message,
    }, 200, req);
  }
});
