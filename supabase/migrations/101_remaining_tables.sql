-- =====================================================
-- Agent OS: 나머지 테이블 생성 (agent_relationships 제외)
-- Supabase Dashboard SQL Editor에서 실행하세요:
-- https://supabase.com/dashboard/project/zcykttygjglzyyxotzct/sql/new
-- =====================================================

-- =====================================================
-- 1. agent_memories: 5가지 메모리 타입
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'private',    -- 개인 메모리 (1:1 대화)
    'meeting',    -- 미팅/회의 메모리
    'team',       -- 팀 공용 메모리
    'injected',   -- 주입된 지식
    'execution'   -- 워크플로우 실행 결과
  )),

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
);

-- =====================================================
-- 2. agent_learnings: 학습된 인사이트
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  category TEXT NOT NULL CHECK (category IN (
    'person', 'project', 'domain', 'workflow',
    'preference', 'decision_rule', 'lesson'
  )),

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
);

-- =====================================================
-- 3. agent_stats: 능력치 시스템
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_stats (
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
);

-- =====================================================
-- 4. agent_knowledge_base: 주입된 지식
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_knowledge_base (
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
);

-- =====================================================
-- 인덱스 생성
-- =====================================================

-- agent_memories 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_relationship ON agent_memories(relationship_id) WHERE relationship_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_memories_created ON agent_memories(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_importance ON agent_memories(agent_id, importance DESC);

-- agent_learnings 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_learnings_agent ON agent_learnings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_category ON agent_learnings(category);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_subject ON agent_learnings(agent_id, subject);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_confidence ON agent_learnings(agent_id, confidence DESC);

-- agent_stats 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_stats_agent ON agent_stats(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_stats_level ON agent_stats(level DESC);
CREATE INDEX IF NOT EXISTS idx_agent_stats_trust ON agent_stats(trust_score DESC);

-- agent_knowledge_base 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_base_agent ON agent_knowledge_base(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_base_category ON agent_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_base_access ON agent_knowledge_base(access_level);

-- =====================================================
-- RLS 정책
-- =====================================================

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_base ENABLE ROW LEVEL SECURITY;

-- agent_memories
CREATE POLICY "Agent owner can manage memories"
  ON agent_memories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_memories.agent_id
      AND owner_id = auth.uid()
    )
  );

-- agent_learnings
CREATE POLICY "Agent owner can manage learnings"
  ON agent_learnings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_learnings.agent_id
      AND owner_id = auth.uid()
    )
  );

-- agent_stats
CREATE POLICY "Agent owner can manage stats"
  ON agent_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_stats.agent_id
      AND owner_id = auth.uid()
    )
  );

-- agent_knowledge_base
CREATE POLICY "Agent owner can manage knowledge base"
  ON agent_knowledge_base FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_knowledge_base.agent_id
      AND owner_id = auth.uid()
    )
  );

-- =====================================================
-- 헬퍼 함수
-- =====================================================

-- 에이전트 능력치 초기화 함수
CREATE OR REPLACE FUNCTION init_agent_stats(p_agent_id UUID)
RETURNS UUID AS $$
DECLARE
  v_stats_id UUID;
BEGIN
  SELECT id INTO v_stats_id FROM agent_stats WHERE agent_id = p_agent_id;
  IF v_stats_id IS NOT NULL THEN RETURN v_stats_id; END IF;

  INSERT INTO agent_stats (agent_id) VALUES (p_agent_id)
  RETURNING id INTO v_stats_id;
  RETURN v_stats_id;
END;
$$ LANGUAGE plpgsql;

-- 능력치 증가 함수
CREATE OR REPLACE FUNCTION increase_agent_stat(
  p_agent_id UUID,
  p_stat_name TEXT,
  p_amount INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  PERFORM init_agent_stats(p_agent_id);

  EXECUTE format(
    'UPDATE agent_stats SET %I = LEAST(%I + $1, 100),
     growth_log = growth_log || $2::jsonb,
     updated_at = NOW()
     WHERE agent_id = $3',
    p_stat_name, p_stat_name
  )
  USING p_amount,
    jsonb_build_object(
      'date', NOW()::date,
      'stat', p_stat_name,
      'change', p_amount,
      'reason', p_reason
    ),
    p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 완료
-- =====================================================
SELECT 'Migration completed successfully!' as status;
