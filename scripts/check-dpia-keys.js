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
const PRIORITY2 = new Set(['bg','da','el','et','fi','ga','hr','hu','lt','lv','mt','pt','ro','sk','sl','no','is','ca']);

const summary = { ok: 0, missingKeys: 0, extraKeys: 0, flatKeys: 0, parseErr: 0, placeholderIssues: 0 };

function flatten(node, prefix = []) {
  const out = [];
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      out.push(...flatten(v, [...prefix, i]));
    });
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      out.push(...flatten(node[k], [...prefix, k]));
    }
  } else {
    out.push(prefix.join('.'));
  }
  return out;
}

function flattenWithValues(node, prefix = []) {
  const out = {};
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      Object.assign(out, flattenWithValues(v, [...prefix, i]));
    });
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      Object.assign(out, flattenWithValues(node[k], [...prefix, k]));
    }
  } else {
    out[prefix.join('.')] = node;
  }
  return out;
}

function extractPlaceholders(s) {
  return new Set((typeof s === 'string' ? s.match(/{[^}]+}/g) : null) || []);
}

function comparePlaceholders(refNode, trgNode, file, keyPath) {
  if (typeof refNode !== 'string' || typeof trgNode !== 'string') return true;
  const r = extractPlaceholders(refNode);
  const t = extractPlaceholders(trgNode);
  const missing = [...r].filter(x => !t.has(x));
  const extra = [...t].filter(x => !r.has(x));
  if (missing.length) {
    console.log(`::error file=${file},title=Missing placeholders::${keyPath} → ${missing.join(', ')}`);
    summary.placeholderIssues++;
  }
  if (extra.length) {
    console.log(`::warning file=${file},title=Extra placeholders::${keyPath} → ${extra.join(', ')}`);
    summary.placeholderIssues++;
  }
  return !missing.length && !extra.length;
}

function loadJSON(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
    return JSON.parse(raw);
  } catch (e) {
    console.log(`::error file=${p},title=Parse error::${e.message}`);
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
const refValues = flattenWithValues(ref.dpia);

console.log(`\n🔍 Checking dpia structure against reference (${refKeys.size} keys)\n`);

let hasDiff = false;

// Get all Priority-2 language directories
const dirs = fs.readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(lang => lang !== REF && PRIORITY2.has(lang))
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
    summary.parseErr++;
    continue;
  }

  // Check for flat dpia.* keys at top level (wrong structure)
  const flatDpiaKeys = Object.keys(j).filter(k => k.startsWith('dpia.'));
  if (flatDpiaKeys.length) {
    console.log(`::warning file=${p},title=Flat dpia keys::${flatDpiaKeys.slice(0, 5).join(', ')}${flatDpiaKeys.length > 5 ? ` ... +${flatDpiaKeys.length - 5} more` : ''}`);
    hasDiff = true;
    summary.flatKeys += flatDpiaKeys.length;
  }

  // Check if dpia exists and is an object
  if (!j.dpia || typeof j.dpia !== 'object') {
    console.log(`::warning file=${p},title=Missing "dpia"::${lang}/common.json has no top-level "dpia" object`);
    hasDiff = true;
    continue;
  }

  // Flatten and compare keys
  const keys = new Set(flatten(j.dpia).map(k => `dpia.${k}`));
  const values = flattenWithValues(j.dpia);

  const missing = [...refKeys].filter(k => !keys.has(k)).sort();
  const extra = [...keys].filter(k => !refKeys.has(k)).sort();

  // Validate placeholders for common keys
  const commonKeys = [...refKeys].filter(k => keys.has(k));
  commonKeys.forEach(k => {
    const shortKey = k.replace(/^dpia\./, '');
    comparePlaceholders(refValues[shortKey], values[shortKey], p, k);
  });

  if (missing.length || extra.length) {
    hasDiff = true;
    if (missing.length) {
      console.log(`::error file=${p},title=Missing keys (${missing.length})::${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` ... +${missing.length - 5} more` : ''}`);
      console.log(`❌ ${lang}: missing ${missing.length} keys`);
      summary.missingKeys += missing.length;
    }
    if (extra.length) {
      console.log(`::warning file=${p},title=Extra keys (${extra.length})::${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ` ... +${extra.length - 5} more` : ''}`);
      console.log(`⚠️  ${lang}: ${extra.length} extra keys`);
      summary.extraKeys += extra.length;
    }
  } else {
    console.log(`✅ ${lang}: OK (${refKeys.size} keys)`);
    summary.ok++;
  }
}

// Apply fail-on-placeholder policy if configured
const failOnPlaceholder = process.env.FAIL_ON_PLACEHOLDER === '1';

if (hasDiff || (failOnPlaceholder && summary.placeholderIssues > 0)) {
  console.log(`\n—— DPIA Summary ——`);
  console.log(`OK locales:         ${summary.ok}`);
  console.log(`Missing keys total: ${summary.missingKeys}`);
  console.log(`Extra keys total:   ${summary.extraKeys}`);
  console.log(`Flat dpia.* found:  ${summary.flatKeys}`);
  console.log(`Placeholder issues: ${summary.placeholderIssues}`);
  console.log(`Parse errors:       ${summary.parseErr}`);
  console.log(`\n❌ DPIA structure differences found. Run 'node scripts/check-locales.js --ref en --fix' to auto-fill missing keys.\n`);
  process.exit(1);
} else {
  console.log(`\n—— DPIA Summary ——`);
  console.log(`✅ All ${summary.ok} locales have matching dpia structure (${refKeys.size} keys each)`);
  if (summary.placeholderIssues > 0) {
    console.log(`⚠️  ${summary.placeholderIssues} placeholder warnings found (set FAIL_ON_PLACEHOLDER=1 to fail on these)`);
  }
  console.log();
  process.exit(0);
}

