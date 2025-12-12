-- =====================================================
-- Agent Memory System: 에이전트 영구 기억 시스템
-- 사람처럼 일하고, 기록하고, 커밋하고, 기억하는 에이전트
-- =====================================================

-- 1. 에이전트 업무 로그 (모든 활동 기록)
-- 대화, 작업, 의사결정 등 모든 행동을 기록
CREATE TABLE IF NOT EXISTS agent_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 로그 유형
  log_type TEXT NOT NULL CHECK (log_type IN (
    'conversation',   -- 대화 참여
    'task_work',      -- 태스크 작업
    'decision',       -- 의사결정
    'analysis',       -- 분석 수행
    'learning',       -- 새로운 정보 학습
    'collaboration',  -- 다른 에이전트와 협업
    'error',          -- 에러/실패 경험
    'milestone'       -- 중요 이정표
  )),

  -- 관련 컨텍스트
  room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  related_agent_ids UUID[] DEFAULT '{}',

  -- 로그 내용
  title TEXT NOT NULL,                    -- 로그 제목 (간단 요약)
  content TEXT NOT NULL,                  -- 상세 내용
  summary TEXT,                           -- AI 생성 요약

  -- 메타데이터
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10), -- 중요도 1-10
  tags TEXT[] DEFAULT '{}',               -- 태그
  metadata JSONB DEFAULT '{}',            -- 추가 데이터

  -- 임베딩 (시맨틱 검색용)
  embedding vector(1536),                 -- OpenAI ada-002 임베딩

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 인덱스용 텍스트 검색 컬럼
  search_text TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('korean', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, ''))
  ) STORED
);

-- 2. 에이전트 커밋 (정기적 업무 요약)
-- 하루/주간 단위로 자동 생성되는 업무 요약
CREATE TABLE IF NOT EXISTS agent_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 커밋 유형 및 기간
  commit_type TEXT NOT NULL CHECK (commit_type IN (
    'hourly',    -- 시간별 (활발한 대화 시)
    'daily',     -- 일간
    'weekly',    -- 주간
    'monthly',   -- 월간
    'milestone'  -- 중요 이정표 달성
  )),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- 커밋 내용
  title TEXT NOT NULL,                    -- 커밋 메시지 (한 줄 요약)
  summary TEXT NOT NULL,                  -- 상세 요약

  -- 통계
  stats JSONB DEFAULT '{}'::jsonb,        -- 대화 수, 태스크 수 등
  /* stats 예시:
  {
    "conversations": 5,
    "tasks_completed": 2,
    "decisions_made": 3,
    "collaborations": 1,
    "key_topics": ["마케팅 전략", "예산 분석"]
  }
  */

  -- 연결된 로그들
  log_ids UUID[] DEFAULT '{}',

  -- 성장/학습 기록
  learnings TEXT[],                       -- 이 기간 배운 것들
  insights TEXT[],                        -- 얻은 인사이트

  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),                 -- 커밋 임베딩

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 에이전트 지식 베이스 (축적된 지식)
-- 프로젝트, 팀, 도메인에 대한 지속적 지식
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 지식 유형
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
    'project',        -- 프로젝트 관련 지식
    'team',           -- 팀/동료 관련 지식
    'domain',         -- 도메인 전문 지식
    'preference',     -- 사용자 선호도
    'procedure',      -- 업무 절차
    'decision_rule',  -- 의사결정 규칙
    'lesson_learned'  -- 경험에서 배운 교훈
  )),

  -- 관련 컨텍스트
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- 지식 내용
  subject TEXT NOT NULL,                  -- 주제/제목
  content TEXT NOT NULL,                  -- 지식 내용
  source_log_ids UUID[] DEFAULT '{}',     -- 출처 로그

  -- 신뢰도 및 상태
  confidence DECIMAL DEFAULT 0.8 CHECK (confidence BETWEEN 0 AND 1),
  is_validated BOOLEAN DEFAULT FALSE,     -- 검증 여부
  last_used_at TIMESTAMPTZ,               -- 마지막 사용 시점
  use_count INTEGER DEFAULT 0,            -- 사용 횟수

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 에이전트 정체성 (불변 + 성장하는 자아)
-- 핵심 페르소나 + 경험을 통한 성장
CREATE TABLE IF NOT EXISTS agent_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE UNIQUE,

  -- 핵심 정체성 (불변)
  core_values TEXT[] NOT NULL,            -- 핵심 가치관
  personality_traits TEXT[] NOT NULL,     -- 성격 특성
  communication_style TEXT,               -- 소통 스타일

  -- 성장하는 정체성
  expertise_areas JSONB DEFAULT '[]',     -- 전문 분야 및 숙련도
  /* expertise_areas 예시:
  [
    {"area": "마케팅 분석", "level": 0.8, "experience_count": 45},
    {"area": "예산 관리", "level": 0.6, "experience_count": 12}
  ]
  */

  working_style TEXT,                     -- 업무 스타일 (경험으로 형성)
  strengths TEXT[],                       -- 강점
  growth_areas TEXT[],                    -- 성장 필요 영역

  -- 관계 기억
  relationship_notes JSONB DEFAULT '{}',  -- 다른 에이전트/사용자와의 관계
  /* relationship_notes 예시:
  {
    "user_123": {"rapport": 0.9, "notes": "상세한 설명 선호"},
    "agent_456": {"collaboration_count": 10, "compatibility": 0.85}
  }
  */

  -- 자기 인식 요약
  self_summary TEXT,                      -- "나는 이런 에이전트입니다"
  recent_focus TEXT,                      -- 최근 집중하고 있는 것

  -- 통계
  total_conversations INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  total_decisions_made INTEGER DEFAULT 0,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 에이전트 컨텍스트 스냅샷 (빠른 컨텍스트 로드용)
-- 응답 시 빠르게 로드할 수 있는 압축된 컨텍스트
CREATE TABLE IF NOT EXISTS agent_context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 스냅샷 유형
  context_type TEXT NOT NULL CHECK (context_type IN (
    'room',           -- 특정 채팅방 컨텍스트
    'project',        -- 프로젝트 컨텍스트
    'global'          -- 전역 컨텍스트 (최신)
  )),

  -- 관련 ID
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- 압축된 컨텍스트
  context_summary TEXT NOT NULL,          -- 컨텍스트 요약
  key_facts TEXT[],                       -- 핵심 팩트 목록
  recent_decisions TEXT[],                -- 최근 의사결정
  pending_items TEXT[],                   -- 미완료 항목

  -- 관련 지식 ID들 (빠른 조회용)
  relevant_knowledge_ids UUID[] DEFAULT '{}',
  relevant_commit_ids UUID[] DEFAULT '{}',

  -- 메타데이터
  token_count INTEGER,                    -- 토큰 수 (최적화용)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                  -- TTL
);

-- =====================================================
-- 인덱스 생성
-- =====================================================

-- 업무 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_agent ON agent_work_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_type ON agent_work_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_room ON agent_work_logs(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_task ON agent_work_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_project ON agent_work_logs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_created ON agent_work_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_importance ON agent_work_logs(agent_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_search ON agent_work_logs USING GIN(search_text);

-- 벡터 검색 인덱스 (HNSW for pgvector)
CREATE INDEX IF NOT EXISTS idx_agent_work_logs_embedding ON agent_work_logs
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 커밋 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_commits_agent ON agent_commits(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commits_type ON agent_commits(commit_type);
CREATE INDEX IF NOT EXISTS idx_agent_commits_period ON agent_commits(agent_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_agent_commits_embedding ON agent_commits
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 지식 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent ON agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_type ON agent_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_project ON agent_knowledge(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_embedding ON agent_knowledge
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 컨텍스트 스냅샷 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_context_agent ON agent_context_snapshots(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_type ON agent_context_snapshots(context_type);
CREATE INDEX IF NOT EXISTS idx_agent_context_room ON agent_context_snapshots(room_id) WHERE room_id IS NOT NULL;

-- =====================================================
-- 트리거: updated_at 자동 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION update_agent_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_knowledge_updated
  BEFORE UPDATE ON agent_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

CREATE TRIGGER agent_identity_updated
  BEFORE UPDATE ON agent_identity
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

CREATE TRIGGER agent_context_updated
  BEFORE UPDATE ON agent_context_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

-- =====================================================
-- RLS 정책
-- =====================================================

ALTER TABLE agent_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_context_snapshots ENABLE ROW LEVEL SECURITY;

-- 에이전트 소유자만 접근 가능
CREATE POLICY "Agent owner can manage work logs"
  ON agent_work_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_work_logs.agent_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Agent owner can manage commits"
  ON agent_commits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_commits.agent_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Agent owner can manage knowledge"
  ON agent_knowledge FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_knowledge.agent_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Agent owner can manage identity"
  ON agent_identity FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_identity.agent_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Agent owner can manage context"
  ON agent_context_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_context_snapshots.agent_id
      AND owner_id = auth.uid()
    )
  );

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON TABLE agent_work_logs IS '에이전트의 모든 업무 활동 기록 - 대화, 작업, 의사결정 등';
COMMENT ON TABLE agent_commits IS '에이전트 업무 요약 커밋 - 일간/주간 자동 생성';
COMMENT ON TABLE agent_knowledge IS '에이전트가 축적한 지식 - 프로젝트, 팀, 도메인 전문성';
COMMENT ON TABLE agent_identity IS '에이전트 정체성 - 핵심 페르소나 + 성장 기록';
COMMENT ON TABLE agent_context_snapshots IS '빠른 컨텍스트 로드용 스냅샷';
