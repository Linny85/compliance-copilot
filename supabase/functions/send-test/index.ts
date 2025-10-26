import { sendWithTemplate } from "../email/client.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to = "test@example.com" } = await req.json().catch(() => ({}));
    
    const res = await sendWithTemplate(to, "dev_test_mail", {
      app_url: Deno.env.get("APP_URL") || "https://app.norrland-innovate.com",
      test_date: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, messageId: res.MessageID }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-test] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
