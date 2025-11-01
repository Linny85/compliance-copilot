#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const LOCALES_DIR = path.join(process.cwd(), 'public/locales');
const LOCALES = ['de', 'en', 'sv', 'bg', 'ca', 'cs', 'da', 'el', 'es', 'et', 'fi', 'fr', 'ga', 'hr', 'hu', 'is', 'it', 'lt', 'lv', 'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'sk', 'sl'];
const BASE_LOCALE = 'en'; // Reference locale
const NAMESPACES = ['common', 'nav', 'admin', 'aiAct', 'aiSystems', 'assistant', 'billing', 'checks', 'controls', 'dashboard', 'documents', 'evidence', 'helpbot', 'nis2', 'reports', 'scope', 'training', 'organization'];

/**
 * Flatten nested JSON object to dot-notation keys
 * { a: { b: 'value' } } → { 'a.b': 'value' }
 */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = String(v ?? '');
    }
  }
  return out;
}

/**
 * Read and parse locale JSON file
 */
function readLocaleFile(locale, namespace) {
  const filePath = path.join(LOCALES_DIR, locale, `${namespace}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`❌ Failed to parse ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * Main validation function
 */
function validateI18n() {
  let hasErrors = false;
  const report = {
    totalKeys: 0,
    missingByLocale: {},
    extraByLocale: {},
    emptyByLocale: {}
  };

  for (const namespace of NAMESPACES) {
    console.log(`\n📦 Checking namespace: ${namespace}`);
    
    // Load base locale
    const baseContent = readLocaleFile(BASE_LOCALE, namespace);
    if (!baseContent) {
      console.log(`  ⚠️  Base locale (${BASE_LOCALE}) not found, skipping`);
      continue;
    }
    
    const baseFlat = flatten(baseContent);
    const baseKeys = Object.keys(baseFlat);
    report.totalKeys += baseKeys.length;
    
    console.log(`  ℹ️  ${baseKeys.length} keys in base locale`);

    // Check each locale
    for (const locale of LOCALES) {
      if (locale === BASE_LOCALE) continue;

      const content = readLocaleFile(locale, namespace);
      if (!content) {
        if (!report.missingByLocale[locale]) {
          report.missingByLocale[locale] = {};
        }
        report.missingByLocale[locale][namespace] = baseKeys;
        continue;
      }

      const flat = flatten(content);
      const keys = Object.keys(flat);

      // Find missing keys
      const missing = baseKeys.filter(k => !(k in flat));
      if (missing.length > 0) {
        if (!report.missingByLocale[locale]) {
          report.missingByLocale[locale] = {};
        }
        if (!report.missingByLocale[locale][namespace]) {
          report.missingByLocale[locale][namespace] = [];
        }
        report.missingByLocale[locale][namespace].push(...missing);
        hasErrors = true;
      }

      // Find extra keys (not in base)
      const extra = keys.filter(k => !(k in baseFlat));
      if (extra.length > 0) {
        if (!report.extraByLocale[locale]) {
          report.extraByLocale[locale] = {};
        }
        if (!report.extraByLocale[locale][namespace]) {
          report.extraByLocale[locale][namespace] = [];
        }
        report.extraByLocale[locale][namespace].push(...extra);
      }

      // Find empty values
      const empty = keys.filter(k => !flat[k] || flat[k].trim() === '');
      if (empty.length > 0) {
        if (!report.emptyByLocale[locale]) {
          report.emptyByLocale[locale] = {};
        }
        if (!report.emptyByLocale[locale][namespace]) {
          report.emptyByLocale[locale][namespace] = [];
        }
        report.emptyByLocale[locale][namespace].push(...empty);
        hasErrors = true;
      }
    }
  }

  // Print summary
  console.log('\n═══ I18N VALIDATION SUMMARY ═══\n');
  console.log(`Total keys in base locale (${BASE_LOCALE}): ${report.totalKeys}`);

  // Missing keys
  const missingCount = Object.keys(report.missingByLocale).length;
  if (missingCount > 0) {
    console.log(`\n❌ ${missingCount} locale(s) with missing keys:`);
    for (const [locale, namespaces] of Object.entries(report.missingByLocale)) {
      const totalMissing = Object.values(namespaces).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`\n  ${locale}: ${totalMissing} missing key(s)`);
      for (const [ns, keys] of Object.entries(namespaces)) {
        console.log(`    ${ns}: ${keys.length} keys`);
        keys.slice(0, 5).forEach(k => console.log(`      • ${k}`));
        if (keys.length > 5) {
          console.log(`      ... and ${keys.length - 5} more`);
        }
      }
    }
  }

  // Empty values
  const emptyCount = Object.keys(report.emptyByLocale).length;
  if (emptyCount > 0) {
    console.log(`\n⚠️  ${emptyCount} locale(s) with empty values:`);
    for (const [locale, namespaces] of Object.entries(report.emptyByLocale)) {
      const totalEmpty = Object.values(namespaces).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`  ${locale}: ${totalEmpty} empty value(s)`);
    }
  }

  // Extra keys (informational)
  const extraCount = Object.keys(report.extraByLocale).length;
  if (extraCount > 0) {
    console.log(`\nℹ️  ${extraCount} locale(s) with extra keys (not in base):`);
    for (const [locale, namespaces] of Object.entries(report.extraByLocale)) {
      const totalExtra = Object.values(namespaces).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`  ${locale}: ${totalExtra} extra key(s) (consider removing)`);
    }
  }

  console.log('\n═══════════════════════════════\n');

  if (!hasErrors) {
    console.log('✅ i18n validation passed - no missing keys or empty values\n');
    return 0;
  } else {
    console.log('❌ i18n validation failed - please fix missing keys and empty values\n');
    return 2;
  }
}

// Run validation
const exitCode = validateI18n();
process.exit(exitCode);
