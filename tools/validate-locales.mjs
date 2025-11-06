import fs from 'fs';
import path from 'path';

const root = 'public/locales';
let failed = false;
let totalFiles = 0;
let validFiles = 0;

console.log('🔍 Validating i18n JSON files...\n');

for (const lng of fs.readdirSync(root)) {
  const dir = path.join(root, lng);
  if (!fs.statSync(dir).isDirectory()) continue;
  
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    totalFiles++;
    const p = path.join(dir, f);
    const src = fs.readFileSync(p, 'utf8')
      // Remove line comments (not valid in JSON but sometimes added)
      .replace(/^\s*\/\/.*$/gm, '')
      // Remove block comments
      .replace(/\/\*[\s\S]*?\*\//gm, '');
    
    try {
      const parsed = JSON.parse(src);
      console.log('✅ ', p);
      validFiles++;
      
      // Check for trailing commas (common error)
      if (/,\s*[}\]]/m.test(src)) {
        console.warn('⚠️  Warning: Trailing comma detected in', p);
      }
    } catch (e) {
      console.error('❌ ', p);
      console.error('   →', e.message);
      failed = true;
    }
  }
}

console.log(`\n📊 Summary: ${validFiles}/${totalFiles} files valid`);

if (failed) {
  console.error('\n❌ Validation failed. Please fix JSON syntax errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All i18n JSON files are valid!');
  process.exit(0);
}
