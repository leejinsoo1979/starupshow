// 마이그레이션 101 - 나머지 테이블 생성 스크립트
// agent_relationships 제외 (이미 존재)
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SQL 문장들을 개별 실행
const statements = [
  // 1. agent_memories 테이블
  `CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('private', 'meeting', 'team', 'injected', 'execution')),
    relationship_id UUID REFERENCES agent_relationships(id) ON DELETE SET NULL,
    meeting_id UUID,
    room_id UUID,
    team_id UUID,
    workflow_run_id UUID,
    raw_content TEXT NOT NULL,
    summary TEXT,
    importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    linked_memory_ids UUID[] DEFAULT '{}',
    embedding vector(1536),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 2. agent_learnings 테이블
  `CREATE TABLE IF NOT EXISTS agent_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('person', 'project', 'domain', 'workflow', 'preference', 'decision_rule', 'lesson')),
    subject TEXT NOT NULL,
    subject_id UUID,
    insight TEXT NOT NULL,
    confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
    evidence_count INTEGER DEFAULT 1,
    source_memory_ids UUID[] DEFAULT '{}',
    source_workflow_run_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 3. agent_stats 테이블
  `CREATE TABLE IF NOT EXISTS agent_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE UNIQUE,
    analysis INTEGER DEFAULT 20 CHECK (analysis BETWEEN 0 AND 100),
    communication INTEGER DEFAULT 20 CHECK (communication BETWEEN 0 AND 100),
    creativity INTEGER DEFAULT 20 CHECK (creativity BETWEEN 0 AND 100),
    leadership INTEGER DEFAULT 10 CHECK (leadership BETWEEN 0 AND 100),
    expertise JSONB DEFAULT '{}'::jsonb,
    total_interactions INTEGER DEFAULT 0,
    total_meetings INTEGER DEFAULT 0,
    total_workflow_executions INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    avg_response_time_seconds INTEGER,
    total_cost DECIMAL(10,4) DEFAULT 0,
    trust_score INTEGER DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
    growth_log JSONB DEFAULT '[]'::jsonb,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 4. agent_knowledge_base 테이블
  `CREATE TABLE IF NOT EXISTS agent_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    chunk_index INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 1,
    parent_doc_id UUID,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'team', 'public')),
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
];

async function runMigration() {
  console.log('=== Agent OS 마이그레이션 101 (나머지 테이블) ===\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  // REST API를 통해 직접 SQL을 실행할 수 없으므로
  // SQL 문을 복사해서 Supabase Dashboard에서 실행하라는 안내 출력

  console.log('⚠️ Supabase JS Client로는 DDL (CREATE TABLE) 실행이 불가합니다.\n');
  console.log('다음 SQL을 Supabase Dashboard SQL Editor에서 실행하세요:');
  console.log('URL: https://supabase.com/dashboard/project/zcykttygjglzyyxotzct/sql/new\n');
  console.log('='.repeat(60));

  for (let i = 0; i < statements.length; i++) {
    console.log(`\n-- [${i + 1}/${statements.length}] Statement`);
    console.log(statements[i] + ';\n');
  }

  console.log('='.repeat(60));
  console.log('\n인덱스 및 RLS는 테이블 생성 후 별도로 실행하세요.');

  // 간단한 테이블 존재 확인
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n=== 현재 테이블 상태 확인 ===\n');
  const tables = ['agent_relationships', 'agent_memories', 'agent_learnings', 'agent_stats', 'agent_knowledge_base'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log(`❌ ${table} - 없음 (생성 필요)`);
    } else if (error && error.message.includes('schema cache')) {
      console.log(`❌ ${table} - 없음 (생성 필요)`);
    } else if (error) {
      console.log(`⚠️ ${table} - ${error.message}`);
    } else {
      console.log(`✅ ${table} - 존재`);
    }
  }
}

runMigration();
