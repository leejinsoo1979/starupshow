// ERP Migration Script
// Run this from the Supabase SQL Editor or use this script with database URL

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zcykttygjglzyyxotzct.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeWt0dHlnamdsenl5eG90emN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMzODkxNSwiZXhwIjoyMDgwOTE0OTE1fQ.SovGgYnnamWGIza0fiG0uYCzW8p4c5bG3qAeBRAz0UU';

async function runMigration() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema: 'public' },
    auth: { persistSession: false }
  });

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251229_erp_system.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  // Split by major statements (CREATE TABLE, CREATE INDEX, etc.)
  const statements = sqlContent
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;

    try {
      // Use raw SQL via rpc or postgres function
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        console.log(`[${i + 1}/${statements.length}] Error: ${error.message}`);
        failed++;
      } else {
        console.log(`[${i + 1}/${statements.length}] Success`);
        success++;
      }
    } catch (err) {
      console.log(`[${i + 1}/${statements.length}] Exception: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nMigration complete: ${success} success, ${failed} failed`);
}

// Run if this is the main module
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
