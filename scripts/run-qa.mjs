import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function nowParts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return {
    YYYY: d.getFullYear(),
    MM: p(d.getMonth() + 1),
    DD: p(d.getDate()),
    HH: p(d.getHours()),
    mm: p(d.getMinutes()),
    ss: p(d.getSeconds())
  };
}

function template(str, vars) {
  return str.replace(/\$\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

async function httpGetJson(baseUrl, route, headers) {
  const url = new URL(route, baseUrl).toString();
  const res = await fetch(url, { headers, redirect: "manual" });
  const status = res.status;
  const headersObj = Object.fromEntries(res.headers.entries());

  // Handle redirects (e.g., 302 → /auth) without reading body
  if (status >= 300 && status < 400) {
    return {
      status,
      headers: headersObj,
      body: { redirect: headersObj.location || null }
    };
  }

  const text = await res.text();
  // Try JSON parse, fallback to raw text (e.g., HTML error page)
  try {
    return { status, headers: headersObj, body: JSON.parse(text) };
  } catch {
    return { status, headers: headersObj, body: { raw: text } };
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function redact(obj) {
  const s = JSON.stringify(obj);
  const scrub = s
    .replace(/(Authorization":\s*")[^"]+/gi, '$1[REDACTED]')
    .replace(/(Cookie":\s*")[^"]+/gi, '$1[REDACTED]')
    .replace(/(sb:token=)[^;"]+/gi, '$1[REDACTED]')
    .replace(/(sb:refresh=)[^;"]+/gi, '$1[REDACTED]');
  return JSON.parse(scrub);
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(redact(obj), null, 2) + "\n");
  return file;
}

function isPassable(r) {
  // 2xx ok, 3xx ok (Guard-Redirects sind gewollt)
  if (r.status >= 200 && r.status < 300) return true;
  if (r.status >= 300 && r.status < 400) return true;
  // Check phase-specific whitelist for expected 401/403
  const allow = ALLOW_STATUS[r.profile]?.[r.phase] || [];
  return allow.includes(r.status);
}

function writeJUnit(results, outPath) {
  const esc = (s='') => s.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'}[c]));
  const cases = results.map(r=>{
    const name = `${r.profile}/${r.phase}`;
    const ok = isPassable(r);
    const body = esc(JSON.stringify(r.body || {}).slice(0,2000));
    return ok
      ? `<testcase name="${esc(name)}" time="${(r.elapsedMs||0)/1000}"/>`
      : `<testcase name="${esc(name)}" time="${(r.elapsedMs||0)/1000}"><failure message="HTTP ${r.status||'ERR'}">${body}</failure></testcase>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><testsuite name="QA Runner" tests="${results.length}">${cases}</testsuite>`;
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, xml);
}

function loadTasks() {
  const p = path.join(process.cwd(), "qa", "tasks", "part2.tasks.json");
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// Whitelist expected status codes per phase/profile
// Customize based on your specific auth/guard/RBAC expectations
const ALLOW_STATUS = {
  unauth: { redirects: [302,303], i18n: [200], phase3: [401], phase4: [200] },
  auth:   { redirects: [200],     i18n: [200], phase3: [200,403], phase4: [200] }
};

function statusTag(status) {
  if (!status) return 'err';
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 300 && status < 400) return 'rx';
  return 'err';
}

function printSummary(results) {
  const byKey = new Map();
  for (const r of results) {
    const k = `${r.profile}/${r.phase}`;
    const arr = byKey.get(k) || [];
    arr.push(r);
    byKey.set(k, arr);
  }
  console.log('\n═══ QA SUMMARY ═══');
  for (const [k, arr] of byKey.entries()) {
    const verdict = arr.every(isPassable) ? '✓ PASS' : '✗ FAIL';
    const codes = arr.map(x => x.status ?? 'ERR').join(', ');
    console.log(` ${verdict} | ${k.padEnd(20)} [${codes}]`);
  }
  console.log('═══════════════════\n');
}

async function runProfile(tasks, baseUrl, profileKey) {
  const profile = tasks.profiles[profileKey];
  if (!profile) throw new Error(`Unknown profile: ${profileKey}`);

  const headers = { ...(tasks.defaultHeaders || {}) };
  const cookieEnv = profile.cookieEnv;
  if (cookieEnv && process.env[cookieEnv]) headers["Cookie"] = process.env[cookieEnv];

  const results = [];
  for (const phase of tasks.phases) {
    const t0 = Date.now();
    try {
      const r = await httpGetJson(baseUrl, phase.route, headers);
      const elapsedMs = Date.now() - t0;
      const rec = {
        timestamp: new Date().toISOString(),
        profile: profileKey,
        phase: phase.name,
        route: phase.route,
        status: r.status,
        elapsedMs,
        headers: r.headers,
        body: r.body
      };
      results.push(rec);

      // Einzelreport
      const parts = nowParts();
      const tag = statusTag(r.status);
      const file = path.join(
        process.cwd(),
        phase.exportDir,
        `${tag}-${profile.exportPrefix}-${phase.name}-${parts.YYYY}${parts.MM}${parts.DD}-${parts.HH}${parts.mm}${parts.ss}.json`
      );
      writeJson(file, rec);
      console.log(`✓ ${profileKey}/${phase.name} → ${r.status} (${elapsedMs}ms)`);
    } catch (e) {
      const rec = {
        timestamp: new Date().toISOString(),
        profile: profileKey,
        phase: phase.name,
        route: phase.route,
        error: String(e)
      };
      results.push(rec);
      const parts = nowParts();
      const tag = 'err'; // Catch block always means error
      const file = path.join(
        process.cwd(),
        phase.exportDir,
        `${tag}-${profile.exportPrefix}-${phase.name}-${parts.YYYY}${parts.MM}${parts.DD}-${parts.HH}${parts.mm}${parts.ss}.json`
      );
      writeJson(file, rec);
      console.log(`✗ ${profileKey}/${phase.name} → ERROR`);
    }
  }

  // Summary
  printSummary(results);

  // Bundle
  const parts = nowParts();
  const bundleName = template(tasks.bundle.filePattern, {
    PROFILE: profile.exportPrefix,
    ...parts
  });
  const bundlePath = path.join(process.cwd(), tasks.bundle.exportDir, bundleName);
  writeJson(bundlePath, { baseUrl, profile: profileKey, results });
  console.log(`◎ Bundle gespeichert: ${bundlePath}`);
  
  // JUnit export for CI dashboards
  const junitPath = path.join(
    process.cwd(), 
    tasks.bundle.exportDir, 
    `qa-junit-${profile.exportPrefix}-${parts.YYYY}${parts.MM}${parts.DD}-${parts.HH}${parts.mm}${parts.ss}.xml`
  );
  writeJUnit(results, junitPath);
  console.log(`✔ JUnit export: ${junitPath}`);
  
  return bundlePath;
}

async function main() {
  const BASE_URL = process.env.QA_BASE_URL;
  if (!BASE_URL) throw new Error("Missing env QA_BASE_URL");

  const run = process.env.QA_RUN || "auth,unauth";
  const tasks = loadTasks();
  const profiles = run.split(",").map((s) => s.trim()).filter(Boolean);

  for (const p of profiles) {
    await runProfile(tasks, BASE_URL, p);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
