import fs from 'fs';
import path from 'path';

const langs = ['de', 'en', 'sv'];
let failed = false;

for (const lng of langs) {
  const p = path.resolve(`public/locales/${lng}/common.json`);
  const raw = fs.readFileSync(p, 'utf8');
  if (/\"training\"\s*:/.test(raw)) {
    console.error(`[i18n-guard] training-block found in ${lng}/common.json`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('[i18n-guard] ✅ OK: no training blocks in common.json');
