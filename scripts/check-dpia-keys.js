#!/usr/bin/env node
/**
 * DPIA Key Structure Checker
 * - Compares dpia object structure between en/common.json and all other languages
 * - Outputs GitHub Actions annotations for missing/extra keys
 * - Exit 0: all languages match reference
 * - Exit 1: differences found
 * - Exit 2: parse error or missing dpia in reference
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(process.cwd(), 'public', 'locales');
const NAMESPACE = 'common.json';
const REF = 'en';

function flatten(obj, prefix = []) {
  const out = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      out.push(...flatten(obj[k], [...prefix, k]));
    }
  } else {
    out.push(prefix.join('.'));
  }
  return out;
}

function loadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${p}: ${e.message}`);
    return null;
  }
}

// Load reference
const refPath = path.join(LOCALES_DIR, REF, NAMESPACE);
const ref = loadJSON(refPath);

if (!ref) {
  console.error(`::error file=${refPath}::Could not load reference locale`);
  process.exit(2);
}

if (!ref.dpia || typeof ref.dpia !== 'object') {
  console.error(`::error file=${refPath}::Reference has no top-level "dpia" object`);
  process.exit(2);
}

const refKeys = new Set(
  flatten(ref.dpia).map(k => `dpia.${k}`)
);

console.log(`\n🔍 Checking dpia structure against reference (${refKeys.size} keys)\n`);

let hasDiff = false;

// Get all language directories
const dirs = fs.readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(lang => lang !== REF)
  .sort();

for (const lang of dirs) {
  const p = path.join(LOCALES_DIR, lang, NAMESPACE);
  
  if (!fs.existsSync(p)) {
    console.log(`⚠️  ${lang}: common.json not found`);
    continue;
  }

  const j = loadJSON(p);
  if (!j) {
    console.log(`::error file=${p},title=Parse error::Could not parse JSON`);
    hasDiff = true;
    continue;
  }

  // Check if dpia exists and is an object
  if (!j.dpia || typeof j.dpia !== 'object') {
    console.log(`::warning file=${p},title=Missing "dpia"::${lang}/common.json has no top-level "dpia" object`);
    hasDiff = true;
    continue;
  }

  // Flatten and compare keys
  const keys = new Set(flatten(j.dpia).map(k => `dpia.${k}`));

  const missing = [...refKeys].filter(k => !keys.has(k));
  const extra = [...keys].filter(k => !refKeys.has(k));

  if (missing.length || extra.length) {
    hasDiff = true;
    if (missing.length) {
      console.log(`::error file=${p},title=Missing keys (${missing.length})::${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` ... +${missing.length - 5} more` : ''}`);
      console.log(`❌ ${lang}: missing ${missing.length} keys`);
    }
    if (extra.length) {
      console.log(`::warning file=${p},title=Extra keys (${extra.length})::${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ` ... +${extra.length - 5} more` : ''}`);
      console.log(`⚠️  ${lang}: ${extra.length} extra keys`);
    }
  } else {
    console.log(`✅ ${lang}: OK (${refKeys.size} keys)`);
  }
}

if (hasDiff) {
  console.log(`\n❌ DPIA structure differences found. Run 'node scripts/check-locales.js --ref en --fix' to auto-fill missing keys.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All locales have matching dpia structure.\n`);
  process.exit(0);
}
