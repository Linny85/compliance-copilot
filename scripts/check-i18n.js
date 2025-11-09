/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'public', 'locales');
const LOCALES = ['de', 'en', 'sv'];
const NAMESPACES = ['norrly', 'common', 'assistant', 'labels'];

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`Failed to read ${p}:`, e.message);
    process.exit(1);
  }
}

function walk(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) return walk(v, key);
    return [key];
  });
}

function sortKeys(obj) {
  if (Array.isArray(obj) || obj === null || typeof obj !== 'object') return obj;
  return Object.keys(obj).sort().reduce((acc, k) => {
    acc[k] = sortKeys(obj[k]);
    return acc;
  }, {});
}

let failed = false;

for (const ns of NAMESPACES) {
  // Referenz ist DE
  const refPath = path.join(ROOT, 'de', `${ns}.json`);
  if (!fs.existsSync(refPath)) {
    console.warn(`[i18n] Reference file missing: ${refPath} - skipping namespace ${ns}`);
    continue;
  }
  
  const ref = readJSON(refPath);
  const refKeys = walk(ref).sort();

  for (const lng of LOCALES) {
    const p = path.join(ROOT, lng, `${ns}.json`);
    if (!fs.existsSync(p)) {
      console.error(`[i18n] Missing file: ${p}`);
      failed = true;
      continue;
    }
    
    const data = readJSON(p);

    // Strukturvergleich: gleiche Schlüsselliste
    const keys = walk(data).sort();
    const missing = refKeys.filter(k => !keys.includes(k));
    const extra = keys.filter(k => !refKeys.includes(k));

    if (missing.length || extra.length) {
      failed = true;
      console.error(`\n[i18n] ❌ Mismatch in ${lng}/${ns}.json`);
      if (missing.length) console.error('  Missing keys:', missing.slice(0, 10), missing.length > 10 ? `... +${missing.length - 10} more` : '');
      if (extra.length) console.error('  Extra keys   :', extra.slice(0, 10), extra.length > 10 ? `... +${extra.length - 10} more` : '');
    }

    // Optionale: sortierte Ausgabe erzwingen (idempotent)
    const sorted = sortKeys(data);
    const current = JSON.stringify(data, null, 2);
    const sortedStr = JSON.stringify(sorted, null, 2);
    
    if (current !== sortedStr) {
      fs.writeFileSync(p, sortedStr + '\n', 'utf8');
      console.log(`[i18n] ✓ Sorted keys in ${lng}/${ns}.json`);
    }
  }
}

if (failed) {
  console.error('\n[i18n] ❌ Validation failed. Align keys/structure across locales.');
  process.exit(1);
} else {
  console.log('\n[i18n] ✅ Validation passed - all locales have matching structure.');
}
