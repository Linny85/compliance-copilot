import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES_DIR = "public/locales";
const LOCALES = ["de", "en", "sv"];

// flache + tiefe Schlüssel extrahieren
function deepKeys(obj, prefix = "") {
  const out = [];
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) {
      out.push(...deepKeys(obj[k], p));
    } else {
      out.push(p);
    }
  }
  return out.sort();
}

function readJson(p) {
  const raw = readFileSync(p, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON parse error in ${p}: ${e.message}`);
  }
}

function listNamespaces(localeDir) {
  return readdirSync(localeDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

let hadError = false;

try {
  // Namespaces anhand der EN-Dateien (oder de) bestimmen
  const baseLocale = LOCALES[0];
  const baseDir = join(LOCALES_DIR, baseLocale);
  const namespaces = listNamespaces(baseDir);

  for (const ns of namespaces) {
    // pro Namespace: alle Sprachen einlesen + Keys vergleichen
    const langToKeys = {};
    for (const lng of LOCALES) {
      const file = join(LOCALES_DIR, lng, `${ns}.json`);
      const json = readJson(file);
      langToKeys[lng] = deepKeys(json);
    }

    // Vergleich: gleiche Key-Mengen?
    const refKeys = langToKeys[baseLocale].join("\n");
    for (const lng of LOCALES) {
      const cur = langToKeys[lng].join("\n");
      if (cur !== refKeys) {
        hadError = true;
        // Differenzen hübsch ausgeben
        const refSet = new Set(langToKeys[baseLocale]);
        const curSet = new Set(langToKeys[lng]);
        const missing = [...refSet].filter((k) => !curSet.has(k));
        const extra = [...curSet].filter((k) => !refSet.has(k));

        console.error(`❌ Key mismatch in namespace "${ns}" (${lng})`);
        if (missing.length) {
          console.error(`  Missing keys (${missing.length}):`);
          missing.slice(0, 30).forEach((k) => console.error("   -", k));
          if (missing.length > 30) console.error(`   … +${missing.length - 30} more`);
        }
        if (extra.length) {
          console.error(`  Extra keys (${extra.length}):`);
          extra.slice(0, 30).forEach((k) => console.error("   +", k));
          if (extra.length > 30) console.error(`   … +${extra.length - 30} more`);
        }
      }
    }
  }
} catch (e) {
  hadError = true;
  console.error("❌ Locale validation fatal error:", e.message);
}

if (hadError) {
  process.exit(1);
} else {
  console.log("✅ Locales valid: syntax + deep key sets match across languages.");
}
