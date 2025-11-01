import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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

function sortKeys(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  Object.keys(obj).sort().forEach(key => {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      sorted[key] = sortKeys(obj[key]);
    } else {
      sorted[key] = obj[key];
    }
  });
  return sorted;
}

function scaffoldNamespace(lang: string, namespace: string): void {
  const dir = join(LOCALES_DIR, lang);
  const file = join(dir, `${namespace}.json`);
  
  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  // If file doesn't exist, create with empty object
  if (!existsSync(file)) {
    console.log(`✨ Creating ${lang}/${namespace}.json`);
    writeFileSync(file, '{}\n', 'utf-8');
    return;
  }
  
  // If file exists, ensure it's valid JSON and sorted
  try {
    const content = JSON.parse(readFileSync(file, 'utf-8'));
    const sorted = sortKeys(content);
    writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
    console.log(`✓ Sorted ${lang}/${namespace}.json`);
  } catch (error) {
    console.error(`❌ Invalid JSON in ${lang}/${namespace}.json:`, error);
    process.exit(1);
  }
}

function main() {
  console.log('🌍 i18n Namespace Scaffolder\n');
  
  const namespaces = loadNamespaces();
  console.log(`📦 Processing ${namespaces.length} namespaces: ${namespaces.join(', ')}\n`);
  
  for (const lang of SUPPORTED_LANGUAGES) {
    for (const namespace of namespaces) {
      scaffoldNamespace(lang, namespace);
    }
  }
  
  console.log('\n✅ Scaffolding complete!');
}

main();
