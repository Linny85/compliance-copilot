import { corsHeaders } from "../_shared/cors.ts";

interface VerifyResponse {
  valid: boolean;
  verification_code?: string;
  course_code?: string;
  course_title?: string;
  date_completed?: string;
  holder_email?: string;
  holder_name?: string;
  provider?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "missing_code", valid: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // VARIANT A: Internal lookup against courses_catalog + issued certificates
    // This is faster and works offline
    // For now, we return a mock response for demo purposes
    // In production, you would query your certificate issuance system

    // VARIANT B: Proxy to external verifier (if you have a public QR verification service)
    // const verifyUrl = `${Deno.env.get("VERIFY_BASE_URL") || "https://verify.norrland-innovate.com"}/cert/${encodeURIComponent(code)}.json`;
    // const res = await fetch(verifyUrl);
    // if (res.ok) {
    //   const data = await res.json();
    //   return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // }

    // Mock validation for demo (replace with actual logic)
    const isValid = code.length >= 6 && /^[A-Z0-9]+$/i.test(code);
    
    const response: VerifyResponse = {
      valid: isValid,
      verification_code: code,
      course_code: isValid ? "GDPR-BASICS" : undefined,
      course_title: isValid ? "Datenschutz Basics (GDPR)" : undefined,
      date_completed: isValid ? new Date().toISOString().split('T')[0] : undefined,
      holder_email: isValid ? "example@example.com" : undefined,
      provider: isValid ? "Norrland Innovate AB" : undefined,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-cert:", error);
    return new Response(
      JSON.stringify({ error: "internal_error", valid: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
