import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const authClient = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenantId = user.id;

    const body = await req.json();
    const { action, snapshot, userId, collection, record, id } = body ?? {};

    const db = authClient;

    const upsertWithTenant = async (table: string, row: any) => {
      const { error } = await db.from(table)
        .upsert(
          { ...row, tenant_id: tenantId }, 
          { onConflict: "tenant_id,id", ignoreDuplicates: false }
        )
        .select("id")
        .single();
      if (error) throw error;
    };

    if (action === "import") {
      if (!snapshot || snapshot.version !== 1) {
        return new Response(JSON.stringify({ error: "Invalid snapshot" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imported = { companies: 0, vendors: 0, aiSystems: 0 };

      for (const c of snapshot.companies ?? []) {
        await upsertWithTenant("demo_companies", c);
        imported.companies++;
      }
      for (const v of snapshot.vendors ?? []) {
        await upsertWithTenant("demo_vendors", v);
        imported.vendors++;
      }
      for (const a of snapshot.aiSystems ?? []) {
        await upsertWithTenant("demo_ai_systems", a);
        imported.aiSystems++;
      }

      return new Response(
        JSON.stringify({ imported }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get") {
      const tid = userId || tenantId;
      const [companiesRes, vendorsRes, aiSystemsRes] = await Promise.all([
        db.from("demo_companies").select("*").eq("tenant_id", tid),
        db.from("demo_vendors").select("*").eq("tenant_id", tid),
        db.from("demo_ai_systems").select("*").eq("tenant_id", tid),
      ]);

      const result = {
        version: 1 as const,
        companies: companiesRes.data ?? [],
        vendors: vendorsRes.data ?? [],
        aiSystems: aiSystemsRes.data ?? [],
      };
      return new Response(
        JSON.stringify(result), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "upsert") {
      const table =
        collection === "companies" ? "demo_companies" :
        collection === "vendors" ? "demo_vendors" :
        collection === "aiSystems" ? "demo_ai_systems" : null;
      if (!table || !record?.id) {
        return new Response(JSON.stringify({ error: "Invalid upsert payload" }), {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await upsertWithTenant(table, record);
      return new Response(
        JSON.stringify({ ok: true }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove") {
      const table =
        collection === "companies" ? "demo_companies" :
        collection === "vendors" ? "demo_vendors" :
        collection === "aiSystems" ? "demo_ai_systems" : null;
      if (!table || !id) {
        return new Response(JSON.stringify({ error: "Invalid delete payload" }), {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await db.from(table).delete().match({ tenant_id: tenantId, id });
      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Import snapshot error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Server error" }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
