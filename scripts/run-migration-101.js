// 마이그레이션 101 실행 스크립트
// Agent OS: 메모리 & 성장 시스템 v2.0
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('=== Agent OS 마이그레이션 101 실행 ===\n');

  // SQL 파일 읽기
  const sqlPath = path.join(__dirname, '../supabase/migrations/101_agent_os_memory_growth.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // SQL을 세미콜론으로 분리 (주석과 문자열 내 세미콜론 제외)
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`총 ${statements.length}개 SQL 문 실행 예정\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    // 첫 줄에서 설명 추출
    const firstLine = statement.split('\n')[0].substring(0, 60);
    process.stdout.write(`[${i + 1}/${statements.length}] ${firstLine}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

      if (error) {
        // RPC가 없으면 직접 실행 시도
        const { error: directError } = await supabase.from('_exec').select().limit(0);
        throw error;
      }

      console.log(' ✅');
      successCount++;
    } catch (error) {
      // 이미 존재하는 객체 에러는 무시
      if (error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.code === '42P07') {
        console.log(' ⚠️ (이미 존재)');
        successCount++;
      } else {
        console.log(` ❌ ${error.message || error}`);
        errorCount++;
      }
    }
  }

  console.log('\n=== 결과 ===');
  console.log(`성공: ${successCount}`);
  console.log(`실패: ${errorCount}`);
}

// 대안: REST API로 직접 실행
async function runMigrationDirect() {
  console.log('=== Agent OS 마이그레이션 101 (직접 실행) ===\n');

  const sqlPath = path.join(__dirname, '../supabase/migrations/101_agent_os_memory_growth.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Supabase REST API로 SQL 실행은 불가능하므로
  // 대신 테이블별로 생성 확인

  console.log('⚠️ Supabase CLI 로그인이 필요합니다.');
  console.log('\n다음 명령어를 실행하세요:');
  console.log('  1. npx supabase login');
  console.log('  2. npx supabase link --project-ref zcykttygjglzyyxotzct');
  console.log('  3. npx supabase db push');
  console.log('\n또는 Supabase Dashboard에서 SQL Editor로 직접 실행:');
  console.log(`  ${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.co', '.co/project/zcykttygjglzyyxotzct/sql')}`);
  console.log('\nSQL 파일 위치:', sqlPath);
}

runMigrationDirect();
