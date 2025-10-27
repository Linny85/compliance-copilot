import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const body = await req.json() as { tenant_id: string };
    const tenantId = body.tenant_id;

    // jüngste Analyse holen
    const { data: analysis, error } = await supabase
      .from("tenant_analysis")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !analysis) {
      return new Response(JSON.stringify({ error: "No analysis found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Minimal-HTML (sauber druckbar)
    const res = analysis.result as any;
    const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Mandanten-Analyse – TI ⇢ NIS2 & EU AI Act</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif; color:#111; margin: 24px; }
    h1 { font-size: 22px; margin: 0 0 16px; }
    h2 { font-size: 18px; margin: 24px 0 8px; }
    .meta { color:#555; font-size: 12px; margin-bottom: 16px; }
    .card { border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin-bottom:12px; }
    ul { margin:8px 0 0 18px; }
    .muted { color:#6b7280; }
    .tag { display:inline-block; border:1px solid #e5e7eb; border-radius:999px; padding:2px 8px; font-size:12px; margin-right:6px; }
    .grid { display:grid; gap:12px; grid-template-columns: 1fr; }
  </style>
</head>
<body>
  <h1>Mandanten-Analyse: TI ⇢ NIS2 & EU AI Act</h1>
  <div class="meta">Tenant: ${tenantId} · Datum: ${new Date().toLocaleDateString('de-DE')}</div>

  <div class="grid">
    <div class="card">
      <h2>Telematikinfrastruktur (TI)</h2>
      ${res?.ti_status === "in_scope"
        ? `<ul>
             <li>ECC-Umstellung bis 2026</li>
             <li>TI-Betriebsrichtlinien & KIM</li>
             <li>gematik/BSI Sicherheitskontrollen</li>
           </ul>`
        : `<div class="muted">Keine TI-Anbindung angegeben.</div>`}
    </div>

    <div class="card">
      <h2>NIS2 Einstufung</h2>
      ${
        res?.nis2_status === "in_scope"
          ? `In Scope (wichtige/wesentliche Einrichtung). Empfohlen: ISMS, Incident-Reporting, Backups, Awareness.`
          : res?.nis2_status === "watch_designation"
            ? `Unter Schwelle – Monitoring/Designierung prüfen. TI-Pflichten gelten separat.`
            : `<div class="muted">Keine Relevanz festgestellt.</div>`
      }
    </div>

    <div class="card">
      <h2>EU AI Act – Schulung (Art. 4)</h2>
      ${res?.ai_act_training === "required"
        ? `Schulung für Mitarbeitende erforderlich (AI Literacy). Rollenspezifische Curricula (Deployer/Provider) empfehlen.`
        : `<div class="muted">Kein arbeitsbezogener KI-Einsatz angegeben.</div>`}
    </div>
  </div>

  <div style="margin-top:16px">
    ${
      res?.ai_act_role
        ? `<span class="tag">AI-Rolle: ${res.ai_act_role}</span>`
        : ``
    }
    ${
      res?.classification
        ? `<span class="tag">NIS2-Klasse: ${res.classification}</span>`
        : ``
    }
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
