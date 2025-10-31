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
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
  return file;
}

function loadTasks() {
  const p = path.join(process.cwd(), "qa", "tasks", "part2.tasks.json");
  return JSON.parse(fs.readFileSync(p, "utf-8"));
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
      const file = path.join(
        process.cwd(),
        phase.exportDir,
        `${profile.exportPrefix}-${phase.name}-${parts.YYYY}${parts.MM}${parts.DD}-${parts.HH}${parts.mm}${parts.ss}.json`
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
      const file = path.join(
        process.cwd(),
        phase.exportDir,
        `${profile.exportPrefix}-${phase.name}-${parts.YYYY}${parts.MM}${parts.DD}-${parts.HH}${parts.mm}${parts.ss}.json`
      );
      writeJson(file, rec);
      console.log(`✗ ${profileKey}/${phase.name} → ERROR`);
    }
  }

  // Bundle
  const parts = nowParts();
  const bundleName = template(tasks.bundle.filePattern, {
    PROFILE: profile.exportPrefix,
    ...parts
  });
  const bundlePath = path.join(process.cwd(), tasks.bundle.exportDir, bundleName);
  writeJson(bundlePath, { baseUrl, profile: profileKey, results });
  console.log(`◎ Bundle gespeichert: ${bundlePath}`);
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
