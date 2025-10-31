#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'supabase/functions';
const dirs = readdirSync(ROOT).filter(d => {
  const p = join(ROOT, d);
  try {
    return statSync(p).isDirectory() && !d.startsWith('_') && d !== '_disabled';
  } catch {
    return false;
  }
});

const results = [];
for (const d of dirs) {
  const entry = join(ROOT, d, 'index.ts');
  try {
    execFileSync('deno', ['check', entry], { stdio: 'pipe', encoding: 'utf8' });
    results.push({ fn: d, status: 'OK' });
  } catch (e) {
    const out = String(e.stderr || e.stdout || e.message || '');
    const firstLine = out.split('\n').slice(0, 8).join('\n');
    results.push({ fn: d, status: 'FAIL', detail: firstLine });
  }
}

const ok = results.filter(r => r.status === 'OK').length;
const fail = results.length - ok;
console.log(`\n🔍 EDGE FUNCTION CHECK: ${ok} OK / ${fail} FAIL\n`);

for (const r of results) {
  if (r.status === 'FAIL') {
    console.log(`❌ ${r.fn}`);
    console.log(`${r.detail}\n`);
  }
}

if (ok > 0) {
  console.log(`✅ Working functions: ${ok}`);
}

process.exit(fail ? 1 : 0);
