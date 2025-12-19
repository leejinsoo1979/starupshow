-- =====================================================
-- Agent OS: 메모리 & 성장 시스템 v2.0
-- PRD v2.0 기반 - 관계/메모리/능력치/학습 시스템
-- =====================================================

-- =====================================================
-- 1. agent_relationships: 에이전트-사용자/에이전트 관계
-- 기존 agent_identity.relationship_notes JSONB를 정규화
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 관계 대상 (user 또는 agent)
  partner_type TEXT NOT NULL CHECK (partner_type IN ('user', 'agent')),
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_agent_id UUID REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 관계 수치 (0-100)
  rapport INTEGER DEFAULT 10 CHECK (rapport BETWEEN 0 AND 100),        -- 친밀도
  trust INTEGER DEFAULT 10 CHECK (trust BETWEEN 0 AND 100),            -- 신뢰도
  familiarity INTEGER DEFAULT 0 CHECK (familiarity BETWEEN 0 AND 100), -- 친숙도

  -- 소통 스타일
  communication_style TEXT DEFAULT 'formal' CHECK (communication_style IN (
    'formal',      -- 격식체
    'polite',      -- 공손체
    'casual',      -- 친근체
    'friendly'     -- 친한 친구체
  )),

  -- 관계 경계 및 선호도
  boundaries JSONB DEFAULT '{}'::jsonb,
  /* boundaries 예시:
  {
    "preferred_topics": ["마케팅", "전략"],
    "avoided_topics": [],
    "preferred_time": "morning",
    "response_style": "detailed"
  }
  */

  -- 상호작용 통계
  interaction_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  first_interaction_at TIMESTAMPTZ DEFAULT NOW(),

  -- 마일스톤 기록
  milestones JSONB DEFAULT '[]'::jsonb,
  /* milestones 예시:
  [
    {"type": "first_conversation", "date": "2024-12-01", "note": "첫 대화"},
    {"type": "10_conversations", "date": "2024-12-10", "note": "10회 대화 달성"},
    {"type": "project_completed", "date": "2024-12-15", "project_id": "xxx", "note": "프로젝트 완료"}
  ]
  */

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건: partner는 user 또는 agent 중 하나만
  CONSTRAINT valid_partner CHECK (
    (partner_type = 'user' AND partner_user_id IS NOT NULL AND partner_agent_id IS NULL) OR
    (partner_type = 'agent' AND partner_agent_id IS NOT NULL AND partner_user_id IS NULL)
  ),

  -- 유니크: 에이전트-파트너 조합
  CONSTRAINT unique_relationship UNIQUE (agent_id, partner_type, partner_user_id, partner_agent_id)
);

-- =====================================================
-- 2. agent_memories: 5가지 메모리 타입
-- Private, Meeting, Team, Injected, Execution
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 메모리 타입
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'private',    -- 개인 메모리 (1:1 대화)
    'meeting',    -- 미팅/회의 메모리
    'team',       -- 팀 공용 메모리
    'injected',   -- 주입된 지식
    'execution'   -- 워크플로우 실행 결과
  )),

  -- 접근 범위 (프라이버시)
  relationship_id UUID REFERENCES agent_relationships(id) ON DELETE SET NULL,  -- private 메모리용
  meeting_id UUID REFERENCES meeting_records(id) ON DELETE SET NULL,           -- meeting 메모리용
  room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,                   -- 채팅방 참조
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,                        -- team 메모리용

  -- 워크플로우 실행 참조 (execution 메모리용)
  workflow_run_id UUID,

  -- 메모리 내용
  raw_content TEXT NOT NULL,           -- 원본 내용 (절대 삭제 X)
  summary TEXT,                        -- 압축된 요약

  -- 중요도 및 접근
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- 연결된 메모리 (지식 그래프용)
  linked_memory_ids UUID[] DEFAULT '{}',

  -- 임베딩 (벡터 검색용)
  embedding vector(1536),

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 텍스트 검색용
  search_text TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('korean', coalesce(raw_content, '') || ' ' || coalesce(summary, ''))
  ) STORED
);

-- =====================================================
-- 3. agent_learnings: 학습된 인사이트
-- 메모리에서 추출된 패턴 및 인사이트
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 학습 카테고리
  category TEXT NOT NULL CHECK (category IN (
    'person',         -- 특정 사람에 대한 학습
    'project',        -- 프로젝트 관련 학습
    'domain',         -- 도메인 지식
    'workflow',       -- 업무 패턴
    'preference',     -- 선호도
    'decision_rule',  -- 의사결정 규칙
    'lesson'          -- 경험에서 배운 교훈
  )),

  -- 학습 대상
  subject TEXT NOT NULL,              -- 학습 주제 (예: "진수", "B2B 마케팅")
  subject_id UUID,                    -- 관련 ID (user_id, project_id 등)

  -- 인사이트 내용
  insight TEXT NOT NULL,              -- "진수는 데이터 없이 결정 안 함"

  -- 신뢰도 및 검증
  confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  evidence_count INTEGER DEFAULT 1,   -- 근거 수

  -- 출처
  source_memory_ids UUID[] DEFAULT '{}',
  source_workflow_run_ids UUID[] DEFAULT '{}',

  -- 메타데이터
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. agent_stats: 능력치 시스템
-- 5가지 기본 능력치 + 도메인 전문성
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE UNIQUE,

  -- 기본 능력치 (0-100)
  analysis INTEGER DEFAULT 20 CHECK (analysis BETWEEN 0 AND 100),         -- 분석력
  communication INTEGER DEFAULT 20 CHECK (communication BETWEEN 0 AND 100), -- 소통력
  creativity INTEGER DEFAULT 20 CHECK (creativity BETWEEN 0 AND 100),     -- 창의성
  leadership INTEGER DEFAULT 10 CHECK (leadership BETWEEN 0 AND 100),     -- 리더십

  -- 도메인 전문성 (JSONB)
  expertise JSONB DEFAULT '{}'::jsonb,
  /* expertise 예시:
  {
    "marketing": {"level": 75, "experience_count": 45},
    "finance": {"level": 40, "experience_count": 12},
    "development": {"level": 30, "experience_count": 8}
  }
  */

  -- 전체 통계
  total_interactions INTEGER DEFAULT 0,
  total_meetings INTEGER DEFAULT 0,
  total_workflow_executions INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,

  -- 성과 지표
  success_rate DECIMAL(5,2),           -- 성공률 (%)
  avg_response_time_seconds INTEGER,   -- 평균 응답 시간
  total_cost DECIMAL(10,4) DEFAULT 0,  -- 총 비용

  -- 신뢰도 점수 (Governance 연동)
  trust_score INTEGER DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),

  -- 성장 기록
  growth_log JSONB DEFAULT '[]'::jsonb,
  /* growth_log 예시:
  [
    {"date": "2024-12-19", "stat": "analysis", "change": 2, "reason": "데이터 분석 업무 완료"},
    {"date": "2024-12-18", "stat": "communication", "change": 1, "reason": "10회 대화 달성"}
  ]
  */

  -- 레벨 및 경험치
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. agent_knowledge_base: 주입된 지식 (Injected Memory)
-- 에이전트 초기화 시 업로드한 문서
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- 문서 정보
  title TEXT NOT NULL,
  content TEXT NOT NULL,              -- 문서 내용 또는 청크
  file_url TEXT,                      -- 원본 파일 URL
  file_type TEXT,                     -- pdf, md, txt, docx 등

  -- 청크 정보 (큰 문서 분할 시)
  chunk_index INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 1,
  parent_doc_id UUID REFERENCES agent_knowledge_base(id) ON DELETE CASCADE,

  -- 분류
  category TEXT,                      -- 회사정책, 매뉴얼, FAQ 등
  tags TEXT[] DEFAULT '{}',

  -- 접근 레벨
  access_level TEXT DEFAULT 'private' CHECK (access_level IN (
    'private',   -- 해당 에이전트만
    'team',      -- 팀 전체
    'public'     -- 모든 에이전트
  )),

  -- 임베딩
  embedding vector(1536),

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 인덱스 생성
-- =====================================================

-- agent_relationships
CREATE INDEX idx_agent_relationships_agent ON agent_relationships(agent_id);
CREATE INDEX idx_agent_relationships_partner_user ON agent_relationships(partner_user_id) WHERE partner_user_id IS NOT NULL;
CREATE INDEX idx_agent_relationships_partner_agent ON agent_relationships(partner_agent_id) WHERE partner_agent_id IS NOT NULL;
CREATE INDEX idx_agent_relationships_rapport ON agent_relationships(agent_id, rapport DESC);
CREATE INDEX idx_agent_relationships_last_interaction ON agent_relationships(agent_id, last_interaction_at DESC);

-- agent_memories
CREATE INDEX idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX idx_agent_memories_relationship ON agent_memories(relationship_id) WHERE relationship_id IS NOT NULL;
CREATE INDEX idx_agent_memories_meeting ON agent_memories(meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX idx_agent_memories_room ON agent_memories(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_agent_memories_team ON agent_memories(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_agent_memories_created ON agent_memories(agent_id, created_at DESC);
CREATE INDEX idx_agent_memories_importance ON agent_memories(agent_id, importance DESC);
CREATE INDEX idx_agent_memories_search ON agent_memories USING GIN(search_text);

-- 벡터 검색 인덱스 (pgvector)
CREATE INDEX idx_agent_memories_embedding ON agent_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- agent_learnings
CREATE INDEX idx_agent_learnings_agent ON agent_learnings(agent_id);
CREATE INDEX idx_agent_learnings_category ON agent_learnings(category);
CREATE INDEX idx_agent_learnings_subject ON agent_learnings(agent_id, subject);
CREATE INDEX idx_agent_learnings_confidence ON agent_learnings(agent_id, confidence DESC);

-- agent_stats
CREATE INDEX idx_agent_stats_agent ON agent_stats(agent_id);
CREATE INDEX idx_agent_stats_level ON agent_stats(level DESC);
CREATE INDEX idx_agent_stats_trust ON agent_stats(trust_score DESC);

-- agent_knowledge_base
CREATE INDEX idx_agent_knowledge_base_agent ON agent_knowledge_base(agent_id);
CREATE INDEX idx_agent_knowledge_base_category ON agent_knowledge_base(category);
CREATE INDEX idx_agent_knowledge_base_access ON agent_knowledge_base(access_level);
CREATE INDEX idx_agent_knowledge_base_parent ON agent_knowledge_base(parent_doc_id) WHERE parent_doc_id IS NOT NULL;
CREATE INDEX idx_agent_knowledge_base_embedding ON agent_knowledge_base
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- 트리거: updated_at 자동 업데이트
-- =====================================================

CREATE TRIGGER agent_relationships_updated
  BEFORE UPDATE ON agent_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

CREATE TRIGGER agent_learnings_updated
  BEFORE UPDATE ON agent_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

CREATE TRIGGER agent_stats_updated
  BEFORE UPDATE ON agent_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

CREATE TRIGGER agent_knowledge_base_updated
  BEFORE UPDATE ON agent_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_memory_timestamp();

-- =====================================================
-- RLS 정책
-- =====================================================

ALTER TABLE agent_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_base ENABLE ROW LEVEL SECURITY;

-- agent_relationships: 에이전트 소유자 또는 관계 당사자
CREATE POLICY "Agent owner can manage relationships"
  ON agent_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_relationships.agent_id
      AND owner_id = auth.uid()
    )
    OR partner_user_id = auth.uid()
  );

-- agent_memories: 메모리 타입별 접근 제어
CREATE POLICY "Agent owner can manage memories"
  ON agent_memories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_memories.agent_id
      AND owner_id = auth.uid()
    )
  );

-- team 메모리는 팀원도 조회 가능
CREATE POLICY "Team members can view team memories"
  ON agent_memories FOR SELECT
  USING (
    memory_type = 'team'
    AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agent_memories.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- meeting 메모리는 참가자도 조회 가능
CREATE POLICY "Meeting participants can view meeting memories"
  ON agent_memories FOR SELECT
  USING (
    memory_type = 'meeting'
    AND meeting_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM meeting_records mr
      WHERE mr.id = agent_memories.meeting_id
      AND (
        mr.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(mr.participants) p
          WHERE (p->>'id')::uuid = auth.uid()
        )
      )
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

-- team 레벨 지식은 팀원도 조회 가능
CREATE POLICY "Team members can view team knowledge"
  ON agent_knowledge_base FOR SELECT
  USING (
    access_level = 'team'
    AND EXISTS (
      SELECT 1 FROM deployed_agents da
      JOIN teams t ON da.team_id = t.id
      JOIN team_members tm ON t.id = tm.team_id
      WHERE da.id = agent_knowledge_base.agent_id
      AND tm.user_id = auth.uid()
    )
  );

-- =====================================================
-- 헬퍼 함수
-- =====================================================

-- 관계 조회/생성 함수
CREATE OR REPLACE FUNCTION get_or_create_relationship(
  p_agent_id UUID,
  p_partner_type TEXT,
  p_partner_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_relationship_id UUID;
BEGIN
  -- 기존 관계 조회
  IF p_partner_type = 'user' THEN
    SELECT id INTO v_relationship_id
    FROM agent_relationships
    WHERE agent_id = p_agent_id
    AND partner_type = 'user'
    AND partner_user_id = p_partner_id;
  ELSE
    SELECT id INTO v_relationship_id
    FROM agent_relationships
    WHERE agent_id = p_agent_id
    AND partner_type = 'agent'
    AND partner_agent_id = p_partner_id;
  END IF;

  -- 없으면 생성
  IF v_relationship_id IS NULL THEN
    IF p_partner_type = 'user' THEN
      INSERT INTO agent_relationships (agent_id, partner_type, partner_user_id)
      VALUES (p_agent_id, 'user', p_partner_id)
      RETURNING id INTO v_relationship_id;
    ELSE
      INSERT INTO agent_relationships (agent_id, partner_type, partner_agent_id)
      VALUES (p_agent_id, 'agent', p_partner_id)
      RETURNING id INTO v_relationship_id;
    END IF;
  END IF;

  RETURN v_relationship_id;
END;
$$ LANGUAGE plpgsql;

-- 에이전트 능력치 초기화 함수
CREATE OR REPLACE FUNCTION init_agent_stats(p_agent_id UUID)
RETURNS UUID AS $$
DECLARE
  v_stats_id UUID;
BEGIN
  -- 이미 있으면 반환
  SELECT id INTO v_stats_id
  FROM agent_stats
  WHERE agent_id = p_agent_id;

  IF v_stats_id IS NOT NULL THEN
    RETURN v_stats_id;
  END IF;

  -- 없으면 생성
  INSERT INTO agent_stats (agent_id)
  VALUES (p_agent_id)
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
DECLARE
  v_current_value INTEGER;
  v_new_value INTEGER;
BEGIN
  -- 능력치 초기화 (없으면 생성)
  PERFORM init_agent_stats(p_agent_id);

  -- 능력치 증가
  EXECUTE format(
    'UPDATE agent_stats SET %I = LEAST(%I + $1, 100),
     growth_log = growth_log || $2::jsonb
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
-- 코멘트
-- =====================================================

COMMENT ON TABLE agent_relationships IS '에이전트와 사용자/다른 에이전트 간의 관계 (친밀도, 신뢰도, 소통 스타일)';
COMMENT ON TABLE agent_memories IS '에이전트 메모리 시스템 - 5가지 타입: private, meeting, team, injected, execution';
COMMENT ON TABLE agent_learnings IS '메모리에서 추출된 학습 인사이트 및 패턴';
COMMENT ON TABLE agent_stats IS '에이전트 능력치 시스템 - 분석력, 소통력, 창의성, 리더십, 전문성';
COMMENT ON TABLE agent_knowledge_base IS '에이전트 초기화 시 주입된 지식베이스 (문서, 매뉴얼 등)';

COMMENT ON COLUMN agent_relationships.rapport IS '친밀도 (0-100): 관계의 친근함 정도';
COMMENT ON COLUMN agent_relationships.trust IS '신뢰도 (0-100): 상호 신뢰 수준';
COMMENT ON COLUMN agent_relationships.communication_style IS '소통 스타일: formal(격식), polite(공손), casual(친근), friendly(친구)';

COMMENT ON COLUMN agent_memories.memory_type IS '메모리 유형: private(1:1), meeting(회의), team(팀), injected(주입), execution(실행)';
COMMENT ON COLUMN agent_memories.raw_content IS '원본 내용 - 절대 삭제하지 않음';
COMMENT ON COLUMN agent_memories.summary IS '압축된 요약 - Layer 2 Compressed Memory';

COMMENT ON COLUMN agent_stats.analysis IS '분석력: 근거 기반 의사결정 능력';
COMMENT ON COLUMN agent_stats.communication IS '소통력: 명확한 의사소통 능력';
COMMENT ON COLUMN agent_stats.creativity IS '창의성: 대안 제시 및 문제 해결 능력';
COMMENT ON COLUMN agent_stats.leadership IS '리더십: 회의 진행 및 팀 조율 능력';
COMMENT ON COLUMN agent_stats.expertise IS '전문성: 도메인별 숙련도 (JSONB)';
