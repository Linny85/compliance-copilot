#!/usr/bin/env node
import assert from "node:assert";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const origin = process.env.TEST_ORIGIN || "https://example.com";

assert(url && anon, "Set SUPABASE_URL and SUPABASE_ANON_KEY env vars");

async function preflight() {
  const res = await fetch(`${url}/functions/v1/verify-master`, {
    method: "OPTIONS",
    headers: {
      "Origin": origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,apikey,content-type",
    },
  });
  const h = Object.fromEntries(res.headers.entries());
  return { status: res.status, headers: h };
}

async function postWrong() {
  const res = await fetch(`${url}/functions/v1/verify-master`, {
    method: "POST",
    headers: {
      "Origin": origin,
      "Authorization": `Bearer ${anon}`,
      "apikey": anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ company_id: "00000000-0000-0000-0000-000000000000", password: "wrong" }),
  });
  const json = await res.json().catch(() => ({}));
  const h = Object.fromEntries(res.headers.entries());
  return { status: res.status, headers: h, body: json };
}

console.log("Testing CORS configuration for verify-master edge function...");
console.log("Origin:", origin);
console.log("");

const pf = await preflight();
console.log("=== PREFLIGHT (OPTIONS) ===");
console.log("Status:", pf.status, pf.status === 204 ? "✅" : "❌");
console.log("Allow-Origin:", pf.headers["access-control-allow-origin"]);
console.log("Allow-Headers:", pf.headers["access-control-allow-headers"]);
console.log("Allow-Methods:", pf.headers["access-control-allow-methods"]);
console.log("");

const pw = await postWrong();
console.log("=== POST (with wrong password) ===");
console.log("Status:", pw.status, pw.status === 200 ? "✅" : "❌");
console.log("Allow-Origin:", pw.headers["access-control-allow-origin"]);
console.log("Content-Type:", pw.headers["content-type"]);
console.log("Body:", JSON.stringify(pw.body));
console.log("");

// Validate results
const preflightOk = pf.status === 204 && pf.headers["access-control-allow-origin"];
const postOk = pw.status === 200 && pw.headers["access-control-allow-origin"] && pw.body?.ok === false;

if (preflightOk && postOk) {
  console.log("✅ CORS configuration is correct!");
} else {
  console.log("❌ CORS configuration has issues:");
  if (!preflightOk) console.log("  - Preflight request failed or missing CORS headers");
  if (!postOk) console.log("  - POST request failed or missing CORS headers");
  process.exit(1);
}
