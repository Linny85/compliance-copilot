#!/usr/bin/env node
/**
 * DPIA Key Snapshot Generator & Verifier
 * - Generates deterministic snapshot of en/common.json dpia keys
 * - Compares with existing snapshot to detect drift in reference locale
 * - Exit 0: snapshot matches or created successfully
 * - Exit 1: drift detected (new/deleted keys in EN)
 * - Exit 2: parse error or missing dpia in reference
 * 
 * Usage:
 *   node scripts/snapshot-dpia-keys.js          # verify against existing snapshot
 *   node scripts/snapshot-dpia-keys.js --update # regenerate snapshot file
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(process.cwd(), 'public', 'locales');
const REF = 'en';
const NAMESPACE = 'common.json';
const SNAPSHOT_FILE = path.join(process.cwd(), 'scripts', 'dpia-keys.snapshot.json');

const shouldUpdate = process.argv.includes('--update');

function flatten(node, prefix = []) {
  const out = [];
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      out.push(...flatten(v, [...prefix, i]));
    });
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node).sort()) {  // sorted for determinism
      out.push(...flatten(node[k], [...prefix, k]));
    }
  } else {
    out.push(prefix.join('.'));
  }
  return out;
}

function loadJSON(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`::error file=${p}::Failed to parse: ${e.message}`);
    return null;
  }
}

// Load reference
const refPath = path.join(LOCALES_DIR, REF, NAMESPACE);
const ref = loadJSON(refPath);

if (!ref) {
  console.error(`::error file=${refPath}::Could not load reference locale`);
  process.exit(2);
}

if (!ref.dpia || typeof ref.dpia !== 'object') {
  console.error(`::error file=${refPath}::Reference has no top-level "dpia" object`);
  process.exit(2);
}

// Generate current key snapshot
const currentKeys = flatten(ref.dpia).sort();
const currentSnapshot = {
  generated: new Date().toISOString(),
  source: `${REF}/${NAMESPACE}`,
  keyCount: currentKeys.length,
  keys: currentKeys
};

// Update mode: write and exit
if (shouldUpdate) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(currentSnapshot, null, 2) + '\n', 'utf8');
  console.log(`✅ Snapshot updated: ${SNAPSHOT_FILE}`);
  console.log(`   ${currentKeys.length} dpia keys from ${REF}/${NAMESPACE}`);
  process.exit(0);
}

// Verify mode: compare with existing snapshot
if (!fs.existsSync(SNAPSHOT_FILE)) {
  console.log(`⚠️  No snapshot found at ${SNAPSHOT_FILE}`);
  console.log(`   Run 'node scripts/snapshot-dpia-keys.js --update' to create baseline.`);
  
  // Create initial snapshot
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(currentSnapshot, null, 2) + '\n', 'utf8');
  console.log(`✅ Initial snapshot created with ${currentKeys.length} keys`);
  process.exit(0);
}

const savedSnapshot = loadJSON(SNAPSHOT_FILE);
if (!savedSnapshot || !savedSnapshot.keys) {
  console.error(`::error file=${SNAPSHOT_FILE}::Invalid snapshot format`);
  process.exit(2);
}

const savedKeys = new Set(savedSnapshot.keys);
const currentKeysSet = new Set(currentKeys);

const added = currentKeys.filter(k => !savedKeys.has(k));
const removed = savedSnapshot.keys.filter(k => !currentKeysSet.has(k));

if (added.length === 0 && removed.length === 0) {
  console.log(`✅ DPIA key snapshot matches reference (${currentKeys.length} keys)`);
  console.log(`   Last snapshot: ${savedSnapshot.generated}`);
  process.exit(0);
}

// Drift detected
console.log(`\n⚠️  DPIA key drift detected in ${REF}/${NAMESPACE}\n`);

if (added.length > 0) {
  console.log(`::warning file=${refPath},title=New keys (${added.length})::${added.slice(0, 10).join(', ')}${added.length > 10 ? ` ... +${added.length - 10} more` : ''}`);
  console.log(`📝 Added keys (${added.length}):`);
  added.forEach(k => console.log(`   + dpia.${k}`));
}

if (removed.length > 0) {
  console.log(`::warning file=${refPath},title=Removed keys (${removed.length})::${removed.slice(0, 10).join(', ')}${removed.length > 10 ? ` ... +${removed.length - 10} more` : ''}`);
  console.log(`\n🗑️  Removed keys (${removed.length}):`);
  removed.forEach(k => console.log(`   - dpia.${k}`));
}

console.log(`\n📊 Summary:`);
console.log(`   Snapshot:  ${savedSnapshot.keyCount} keys (${savedSnapshot.generated})`);
console.log(`   Current:   ${currentKeys.length} keys`);
console.log(`   Added:     ${added.length}`);
console.log(`   Removed:   ${removed.length}`);

console.log(`\n💡 To update snapshot, run:`);
console.log(`   node scripts/snapshot-dpia-keys.js --update`);
console.log();

process.exit(1);
