import fs from 'fs';
import path from 'path';

const langs = ['de', 'en', 'sv'];
const nss = ['common', 'training'];
const req = {
  common: [
    'name',
    'tagline',
    'greeting',
    'quickPrompts',
    'buttons.open',
    'buttons.cancel',
    'buttons.speak_on',
    'buttons.speak_off'
  ],
  training: [
    'viewCourse',
    'uploadTitle',
    'uploadDescription',
    'dropZone',
    'acceptedFormats',
    'verifyDialog.title',
    'verifyDialog.placeholder',
    'verifyDialog.submit'
  ]
};

function get(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

const baseDir = path.resolve('public/locales');

let failed = false;
for (const lng of langs) {
  for (const ns of nss) {
    const p = path.join(baseDir, lng, `${ns}.json`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const key of req[ns]) {
      if (get(data, key) === undefined) {
        console.error(`[i18n-check] Missing key in ${lng}/${ns}.json: ${key}`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log('[i18n-check] ✅ All required i18n keys present');
