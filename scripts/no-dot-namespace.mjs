import fs from 'fs';
import path from 'path';

const SRC = 'src';
const BAD = [];

function scan(file) {
  const txt = fs.readFileSync(file, 'utf8');
  // Match t('training.something') but not t('training:something')
  const rx = /t\(\s*['"]training\.[^'"]+['"]\s*\)/g;
  let m;
  while ((m = rx.exec(txt))) {
    BAD.push(`${file}:${m.index} -> ${m[0]}`);
  }
}

function walk(dir) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(t|j)sx?$/.test(e)) scan(p);
  }
}

walk(SRC);

if (BAD.length) {
  console.error('[i18n-guard] Dot-namespace detected. Use training:… instead:\n' + BAD.join('\n'));
  process.exit(1);
}

console.log('[i18n-guard] ✅ OK: no dot-style training.* keys');
