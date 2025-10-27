#!/usr/bin/env node

/**
 * CI-Check: Verbietet tx() mit JSON-Namespace-Präfixen
 * 
 * Verwendung:
 *   node scripts/check-tx-namespaces.js
 * 
 * Exit 0: OK
 * Exit 1: Verbotene Patterns gefunden
 */

const fs = require('fs');
const path = require('path');

// Namespaces, die nur über t('ns:key') verwendet werden dürfen
const FORBIDDEN_NAMESPACES = [
  'dashboard',
  'documents',
  'controls',
  'checks',
  'admin',
  'training',
  'assistant',
  'aiSystems',
  'evidence',
  'scope',
  'nav'
];

// Pattern: tx("namespace. oder tx('namespace.
const createPattern = (ns) => new RegExp(`tx\\(["\']${ns}\\.`, 'g');

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];

  FORBIDDEN_NAMESPACES.forEach(ns => {
    const pattern = createPattern(ns);
    let match;
    let lineNumber = 1;
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: idx + 1,
          namespace: ns,
          content: line.trim()
        });
      }
    });
  });

  return violations;
}

function scanDirectory(dir, violations = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, dist, .git
      if (!['node_modules', 'dist', '.git', 'build'].includes(entry.name)) {
        scanDirectory(fullPath, violations);
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const fileViolations = scanFile(fullPath);
      violations.push(...fileViolations);
    }
  });

  return violations;
}

// Main
const srcDir = path.join(__dirname, '..', 'src');
console.log('🔍 Checking for tx() usage with JSON namespaces...\n');

const violations = scanDirectory(srcDir);

if (violations.length > 0) {
  console.error('❌ Found tx() usage with JSON namespace prefixes:\n');
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Namespace: ${v.namespace}`);
    console.error(`    Code: ${v.content}`);
    console.error('');
  });
  console.error(`Total violations: ${violations.length}\n`);
  console.error('💡 Fix: Use useTranslation([\'${namespace}\']) and t(\'${namespace}:key\') instead.\n');
  process.exit(1);
}

console.log('✅ No forbidden tx() usage found. All clear!\n');
process.exit(0);
