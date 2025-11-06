import fs from 'fs';
import path from 'path';

const root = 'public/locales';
let failed = false;
let totalFiles = 0;
let validFiles = 0;
const warnings = [];

console.log('🔍 Validating i18n JSON files...\n');

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
    } else if (e.isFile() && p.endsWith('.json')) {
      totalFiles++;
      const rawSrc = fs.readFileSync(p, 'utf8');
      const src = rawSrc
        // Remove line comments (not valid in JSON but sometimes added)
        .replace(/^\s*\/\/.*$/gm, '')
        // Remove block comments
        .replace(/\/\*[\s\S]*?\*\//gm, '');
      
      try {
        JSON.parse(src);
        console.log('✅ ', p);
        validFiles++;
        
        // Check for trailing commas (common error)
        if (/,\s*[}\]]/m.test(rawSrc)) {
          const warn = `⚠️  Warning: Trailing comma detected in ${p}`;
          console.warn(warn);
          warnings.push(warn);
        }
        
        // Check for unescaped quotes
        if (/"[^"]*"[^"]*"[^"]*":/m.test(rawSrc)) {
          const warn = `⚠️  Warning: Possible unescaped quotes in ${p}`;
          console.warn(warn);
          warnings.push(warn);
        }
      } catch (e) {
        console.error('❌ ', p);
        console.error('   →', e.message);
        // Show context around error
        const match = e.message.match(/line (\d+)/i);
        if (match) {
          const lineNum = parseInt(match[1]);
          const lines = rawSrc.split('\n');
          const start = Math.max(0, lineNum - 3);
          const end = Math.min(lines.length, lineNum + 2);
          console.error('   Context:');
          for (let i = start; i < end; i++) {
            const marker = i === lineNum - 1 ? ' >>> ' : '     ';
            console.error(`   ${marker}${i + 1}: ${lines[i]}`);
          }
        }
        failed = true;
      }
    }
  }
}

walk(root);

console.log(`\n📊 Summary: ${validFiles}/${totalFiles} files valid`);

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} warning(s) detected`);
}

if (failed) {
  console.error('\n❌ Validation failed. Please fix JSON syntax errors above.');
  console.error('💡 Tip: Run "npx prettier --write public/locales/**/*.json" to auto-fix formatting');
  process.exit(1);
} else {
  console.log('\n✅ All i18n JSON files are valid!');
  if (warnings.length > 0) {
    console.log('💡 Consider running prettier to clean up warnings');
  }
  process.exit(0);
}
