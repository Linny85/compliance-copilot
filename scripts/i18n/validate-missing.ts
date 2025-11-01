import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface NamespaceConfig {
  namespaces: string[];
}

const SUPPORTED_LANGUAGES = ['de', 'en', 'sv'];
const LOCALES_DIR = join(process.cwd(), 'public/locales');
const NAMESPACES_FILE = join(process.cwd(), 'i18n.namespaces.json');

function loadNamespaces(): string[] {
  if (!existsSync(NAMESPACES_FILE)) {
    console.warn('⚠️  i18n.namespaces.json not found, using defaults');
    return ['common', 'admin'];
  }
  
  const config: NamespaceConfig = JSON.parse(readFileSync(NAMESPACES_FILE, 'utf-8'));
  return config.namespaces;
}

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function validateNamespace(namespace: string): boolean {
  const enFile = join(LOCALES_DIR, 'en', `${namespace}.json`);
  
  if (!existsSync(enFile)) {
    console.error(`❌ Reference file missing: en/${namespace}.json`);
    return false;
  }
  
  const enContent = JSON.parse(readFileSync(enFile, 'utf-8'));
  const enKeys = new Set(flattenKeys(enContent));
  
  let hasErrors = false;
  
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === 'en') continue; // Skip reference language
    
    const langFile = join(LOCALES_DIR, lang, `${namespace}.json`);
    
    if (!existsSync(langFile)) {
      console.error(`❌ Missing file: ${lang}/${namespace}.json`);
      hasErrors = true;
      continue;
    }
    
    try {
      const langContent = JSON.parse(readFileSync(langFile, 'utf-8'));
      const langKeys = new Set(flattenKeys(langContent));
      
      const missingKeys = Array.from(enKeys).filter(key => !langKeys.has(key));
      const extraKeys = Array.from(langKeys).filter(key => !enKeys.has(key));
      
      if (missingKeys.length > 0) {
        console.error(`❌ ${lang}/${namespace}.json missing keys:`);
        missingKeys.forEach(key => console.error(`   - ${key}`));
        hasErrors = true;
      }
      
      if (extraKeys.length > 0) {
        console.warn(`⚠️  ${lang}/${namespace}.json has extra keys:`);
        extraKeys.forEach(key => console.warn(`   - ${key}`));
      }
    } catch (error) {
      console.error(`❌ Invalid JSON in ${lang}/${namespace}.json:`, error);
      hasErrors = true;
    }
  }
  
  return !hasErrors;
}

function main() {
  console.log('🔍 i18n Validation\n');
  
  const namespaces = loadNamespaces();
  console.log(`📦 Validating ${namespaces.length} namespaces: ${namespaces.join(', ')}\n`);
  
  let allValid = true;
  
  for (const namespace of namespaces) {
    const isValid = validateNamespace(namespace);
    if (isValid) {
      console.log(`✓ ${namespace} - all translations complete`);
    } else {
      allValid = false;
    }
  }
  
  console.log('');
  
  if (allValid) {
    console.log('✅ All translations are complete!');
    process.exit(0);
  } else {
    console.error('❌ Translation gaps found. Please add missing translations.');
    process.exit(1);
  }
}

main();
