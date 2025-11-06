import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const LOCALES_DIR = 'public/locales';
const LOCALES = ['de','en','sv'];

// --- utils ---
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const walkFiles = (dir, exts = ['.ts','.tsx','.js','.jsx']) => {
  const out = execSync(`git ls-files "${dir}"`, { encoding: 'utf8' })
    .split('\n').filter(Boolean)
    .filter(f => exts.some(e => f.endsWith(e)));
  return out;
};
const deepKeys = (obj, prefix='') => {
  if (typeof obj !== 'object' || obj === null) return [prefix].filter(Boolean);
  return Object.entries(obj).flatMap(([k,v]) => deepKeys(v, prefix ? `${prefix}.${k}` : k));
};

// --- collect defined keys (per ns & lang) ---
const listNamespaces = (lang) => readdirSync(join(LOCALES_DIR, lang))
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace(/\.json$/,''));

const defined = {}; // { ns: { lang: Set(keys) } }
const base = 'en'; // reference
for (const ns of listNamespaces(base)) {
  defined[ns] = {};
  for (const lng of LOCALES) {
    const json = readJson(join(LOCALES_DIR, lng, `${ns}.json`));
    defined[ns][lng] = new Set(deepKeys(json));
  }
}

// --- collect USED keys from source code ---
const SRC_DIR = 'src';
const files = walkFiles(SRC_DIR);
const used = {}; // { ns: Set(keys) }
const rx = /(?:(?:i18n\.t|t|tx)\(\s*['"`]([^'"`]+)['"`]\s*[),])|(?:t\(['"`]([a-z0-9_]+)\.([a-z0-9_.-]+)['"`]\))/gi;

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  let m;
  while ((m = rx.exec(text))) {
    const candidate = (m[1] || '').trim();
    if (candidate.includes(':')) { // ns:key
      const [ns, rest] = candidate.split(':');
      if (!used[ns]) used[ns] = new Set();
      used[ns].add(rest.replaceAll(':','.'));
      continue;
    }
    if (m[2] && m[3]) { // ns.key
      const ns = m[2];
      const rest = m[3];
      if (!used[ns]) used[ns] = new Set();
      used[ns].add(rest);
    }
  }
}

// --- report ---
const rows = [];
let hadError = false;
const threshold = Number(process.env.I18N_COVERAGE_MIN ?? 0);

for (const ns of Object.keys(defined)) {
  const usedKeys = Array.from(used[ns] || []);
  const ref = defined[ns][base];

  const usedMissing = usedKeys.filter(k => !ref.has(k));
  const definedUnused = Array.from(ref).filter(k => !usedKeys.includes(k));

  const perLang = {};
  for (const lng of LOCALES) {
    const def = defined[ns][lng];
    const present = usedKeys.filter(k => def.has(k)).length;
    const pct = usedKeys.length ? Math.round((present / usedKeys.length) * 100) : 100;
    perLang[lng] = pct;
    if (pct < threshold) hadError = true;
  }

  rows.push({
    ns,
    used: usedKeys.length,
    missingInRef: usedMissing.length,
    unusedInRef: definedUnused.length,
    coverage: perLang,
  });
}

console.table(rows.map(r => ({
  namespace: r.ns,
  used: r.used,
  missingInRef: r.missingInRef,
  unusedInRef: r.unusedInRef,
  de: r.coverage.de + '%',
  en: r.coverage.en + '%',
  sv: r.coverage.sv + '%'
})));

if (hadError) {
  console.error('❌ i18n coverage below threshold');
  process.exit(1);
} else {
  console.log('✅ i18n coverage OK');
}
