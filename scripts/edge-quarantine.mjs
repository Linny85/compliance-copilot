#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'supabase/functions';
const DIS = join(ROOT, '_disabled');

if (!existsSync(DIS)) {
  mkdirSync(DIS, { recursive: true });
}

const bad = [];
for (const d of readdirSync(ROOT)) {
  const p = join(ROOT, d);
  try {
    if (!statSync(p).isDirectory() || d.startsWith('_') || d === '_disabled') continue;
  } catch {
    continue;
  }
  
  const entry = join(p, 'index.ts');
  if (!existsSync(entry)) continue;
  
  try {
    execFileSync('deno', ['check', entry], { stdio: 'pipe', encoding: 'utf8' });
  } catch {
    bad.push(d);
  }
}

if (bad.length === 0) {
  console.log('✅ All edge functions are healthy, no quarantine needed.');
  process.exit(0);
}

console.log(`\n⚠️  Quarantining ${bad.length} broken function(s):\n`);
for (const d of bad) {
  const from = join(ROOT, d);
  const to = join(DIS, d);
  console.log(`→ ${d}`);
  try {
    if (existsSync(to)) {
      // Remove existing disabled version
      renameSync(to, to + '.old');
    }
    renameSync(from, to);
  } catch (e) {
    console.error(`  ⚠️  Failed to quarantine ${d}: ${e.message}`);
  }
}

console.log(`\n✅ Quarantined functions moved to ${DIS}`);
console.log('   Fix them individually, then move back to supabase/functions/');
