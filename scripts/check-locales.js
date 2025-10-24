#!/usr/bin/env node
/**
 * Locale Consistency Checker
 * - Vergleicht alle JSON-Dateien in /public/locales/<lang>/*.json
 * - Referenzsprache default: en (konfigurierbar via CLI/ENV)
 * - Prüft: fehlende Keys, extra Keys, unterschiedliche Typen
 * - Optional: --fix -> füllt fehlende Keys aus der Referenz (Fallback)
 *
 * Exit-Codes:
 *  0: OK (keine Abweichungen ODER fix angewendet)
 *  1: Abweichungen gefunden (ohne --fix)
 *  2: Lese-/Parsefehler
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, "public", "locales");

// Config via CLI
const args = process.argv.slice(2);
const refLang = (getArg("--ref") || process.env.LOCALE_REF || "en").toLowerCase();
const doFix = args.includes("--fix");
const allowExtra = args.includes("--allow-extra"); // wenn true, extra Keys sind ok (nur Info)
const only = getArg("--only")?.split(",").map(s => s.trim().toLowerCase()); // z.B. --only=de,sv
const ignore = (getArg("--ignore") || "").split(",").map(s => s.trim()).filter(Boolean); // z.B. --ignore=common.debug

function getArg(flag) {
  const i = args.indexOf(flag);
  if (i >= 0) return args[i+1];
  return null;
}

function readJSON(file) {
  try {
    const txt = fs.readFileSync(file, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    console.error(`✗ Parse error in ${file}:`, e.message);
    process.exit(2);
  }
}

function listLanguages() {
  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`✗ Not found: ${LOCALES_DIR}`);
    process.exit(2);
  }
  return fs.readdirSync(LOCALES_DIR).filter(d => {
    const p = path.join(LOCALES_DIR, d);
    return fs.statSync(p).isDirectory();
  }).map(s => s.toLowerCase());
}

function listFiles(lang) {
  const dir = path.join(LOCALES_DIR, lang);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".json"));
}

function flatten(obj, prefix = "", map = {}) {
  if (obj === null || obj === undefined) return map;
  if (typeof obj !== "object") {
    map[prefix.replace(/\.$/, "")] = obj;
    return map;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    map[prefix.replace(/\.$/, "")] = obj;
    return map;
  }
  for (const k of keys) {
    const next = prefix ? `${prefix}.${k}` : k;
    flatten(obj[k], next, map);
  }
  return map;
}

function unflattenTo(baseObj, key, value) {
  const parts = key.split(".");
  let cur = baseObj;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const last = i === parts.length - 1;
    if (last) {
      cur[p] = value;
    } else {
      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
      cur = cur[p];
    }
  }
}

function writeJSONPretty(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function shouldIgnore(key) {
  // exakte oder Prefix-Matches zulassen
  if (ignore.includes(key)) return true;
  return ignore.some(prefix => key.startsWith(prefix + "."));
}

// ---- Main
const languages = listLanguages();
if (!languages.includes(refLang)) {
  console.error(`✗ Reference language '${refLang}' not found in ${LOCALES_DIR}`);
  process.exit(2);
}

const langsFiltered = only ? languages.filter(l => only.includes(l)) : languages;
const refFiles = listFiles(refLang);

if (refFiles.length === 0) {
  console.error(`✗ No JSON files in reference locale: ${refLang}`);
  process.exit(2);
}

let issues = 0;

console.log(`\n🔎 Checking locales against reference '${refLang}' ...`);

for (const file of refFiles) {
  const refPath = path.join(LOCALES_DIR, refLang, file);
  const refObj = readJSON(refPath);
  const refFlat = flatten(refObj);

  for (const lang of langsFiltered) {
    if (lang === refLang) continue;

    const targetPath = path.join(LOCALES_DIR, lang, file);
    if (!fs.existsSync(targetPath)) {
      console.warn(`• ${lang}/${file}: missing file – creating from reference...`);
      if (doFix) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        writeJSONPretty(targetPath, refObj);
      } else {
        issues++;
      }
      continue;
    }

    const trgObj = readJSON(targetPath);
    const trgFlat = flatten(trgObj);

    const missing = [];
    const extra   = [];
    const typeMismatch = [];

    // fehlende Keys
    for (const k of Object.keys(refFlat)) {
      if (shouldIgnore(k)) continue;
      if (!(k in trgFlat)) {
        missing.push(k);
      } else {
        // Typ-Konsistenz
        if (typeof refFlat[k] !== typeof trgFlat[k]) {
          typeMismatch.push({ key: k, ref: typeof refFlat[k], trg: typeof trgFlat[k] });
        }
      }
    }

    // extra Keys
    for (const k of Object.keys(trgFlat)) {
      if (shouldIgnore(k)) continue;
      if (!(k in refFlat)) extra.push(k);
    }

    if (missing.length === 0 && (allowExtra || extra.length === 0) && typeMismatch.length === 0) {
      console.log(`✓ ${lang}/${file} OK`);
      continue;
    }

    // Report
    if (missing.length) {
      console.warn(`• ${lang}/${file} missing keys (${missing.length}):`);
      missing.slice(0, 10).forEach(k => console.warn(`   - ${k}`));
      if (missing.length > 10) console.warn(`   ... +${missing.length - 10} more`);
    }
    if (!allowExtra && extra.length) {
      console.warn(`• ${lang}/${file} extra keys (${extra.length}):`);
      extra.slice(0, 10).forEach(k => console.warn(`   - ${k}`));
      if (extra.length > 10) console.warn(`   ... +${extra.length - 10} more`);
    }
    if (typeMismatch.length) {
      console.warn(`• ${lang}/${file} type mismatches (${typeMismatch.length}):`);
      typeMismatch.slice(0, 10).forEach(({key, ref, trg}) => console.warn(`   - ${key}: ref=${ref} trg=${trg}`));
      if (typeMismatch.length > 10) console.warn(`   ... +${typeMismatch.length - 10} more`);
    }

    if (doFix) {
      // fehlende Keys aus Referenz befüllen
      for (const k of missing) {
        unflattenTo(trgObj, k, refFlat[k]);
      }
      writeJSONPretty(targetPath, trgObj);
      console.log(`  → fixed ${lang}/${file} (filled ${missing.length} keys from ${refLang})`);
    } else {
      issues++;
    }
  }
}

if (issues > 0 && !doFix) {
  console.error(`\n✗ Locale check found issues. Run with --fix to autofill missing keys.\n`);
  process.exit(1);
}

console.log(`\n✅ Locales consistent${doFix ? " (auto-fixed)" : ""}.`);
process.exit(0);
