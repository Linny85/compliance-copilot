#!/usr/bin/env tsx
/**
 * Automated seeding/cleanup script for compliance test data
 * Usage: tsx scripts/run-seed.ts [seed|cleanup]
 * 
 * Required ENV vars:
 * - SUPABASE_PROJECT_URL (e.g., https://xxxxx.supabase.co)
 * - SUPABASE_SERVICE_ROLE (service_role key for SQL execution)
 * - TENANT_USER_UUID (user UUID to replace :USER placeholder)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const mode = process.argv[2];

if (!['seed', 'cleanup'].includes(mode)) {
  console.error('❌ Usage: tsx scripts/run-seed.ts [seed|cleanup]');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_PROJECT_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const USER_UUID = process.env.TENANT_USER_UUID;

// Safety checks
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Missing required env vars: SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

if (!USER_UUID) {
  console.error('❌ Missing TENANT_USER_UUID - cannot replace :USER placeholder');
  process.exit(1);
}

// Prevent prod runs
if (SUPABASE_URL.includes('prod') || SUPABASE_URL.includes('production')) {
  console.error('❌ Refusing to run against production environment');
  process.exit(1);
}

// Read SQL file
const sqlFile = mode === 'seed' 
  ? 'scripts/seed-compliance-data.sql'
  : 'scripts/cleanup-compliance-seed.sql';

let sql: string;
try {
  sql = readFileSync(join(process.cwd(), sqlFile), 'utf-8');
} catch (err) {
  console.error(`❌ Failed to read ${sqlFile}:`, err);
  process.exit(1);
}

// Replace :USER placeholder
sql = sql.replace(/:USER/g, `'${USER_UUID}'`);

console.log(`\n🔧 Running ${mode} for tenant ${USER_UUID.slice(0, 8)}...`);
console.log(`📍 Target: ${SUPABASE_URL}\n`);

// Execute SQL via Supabase REST API
async function executeSql(sqlQuery: string): Promise<void> {
  const endpoint = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql: sqlQuery })
    });

    if (!response.ok) {
      // Fallback: try direct SQL execution via pg_query
      console.log('⚠️  REST API exec_sql failed, trying alternative method...');
      await executeSqlFallback(sqlQuery);
      return;
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Failed to execute SQL via REST:', err);
    console.log('⚠️  Trying fallback method...');
    await executeSqlFallback(sqlQuery);
  }
}

// Fallback: use pg library for direct Postgres connection
async function executeSqlFallback(sqlQuery: string): Promise<void> {
  try {
    // Dynamic import to avoid requiring pg if not needed
    const { Client } = await import('pg');
    
    const connectionString = SUPABASE_URL.replace('https://', 'postgresql://postgres:')
      .replace('.supabase.co', '.supabase.co:5432/postgres');
    
    const client = new Client({ connectionString });
    await client.connect();
    
    const result = await client.query(sqlQuery);
    console.log('✅ SQL executed successfully (via pg)');
    console.log('📊 Rows affected:', result.rowCount);
    
    await client.end();
  } catch (err) {
    console.error('❌ Fallback execution failed:', err);
    console.error('\n💡 Manual execution required. Copy SQL from:', sqlFile);
    process.exit(1);
  }
}

// Run
executeSql(sql).catch(err => {
  console.error('❌ Execution failed:', err);
  process.exit(1);
});
