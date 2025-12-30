#!/usr/bin/env node
/**
 * Run BACKLOG status migration for project_tasks table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zcykttygjglzyyxotzct.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeWt0dHlnamdsenl5eG90emN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMzODkxNSwiZXhwIjoyMDgwOTE0OTE1fQ.SovGgYnnamWGIza0fiG0uYCzW8p4c5bG3qAeBRAz0UU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running BACKLOG status migration...');

  // Drop existing constraint and add new one with BACKLOG
  const sql = `
    ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_status_check;
    ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_status_check
      CHECK (status IN ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'));
  `;

  // Supabase JS doesn't support raw SQL directly, so we need to use rpc
  // Check if there's an exec_sql function or use the postgres connection

  // Alternative: Use the pg package directly
  const { Pool } = require('pg');

  // Try to get the connection string from environment
  const connectionString = process.env.DATABASE_URL ||
    `postgresql://postgres.zcykttygjglzyyxotzct:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.log('\n⚠️  SUPABASE_DB_PASSWORD not set. Please run this SQL manually in Supabase Dashboard SQL Editor:\n');
    console.log('-----------------------------------');
    console.log(sql);
    console.log('-----------------------------------');
    process.exit(0);
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\nPlease run this SQL manually in Supabase Dashboard SQL Editor:\n');
    console.log('-----------------------------------');
    console.log(sql);
    console.log('-----------------------------------');
  } finally {
    await pool.end();
  }
}

runMigration();
