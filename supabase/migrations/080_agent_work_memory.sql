-- =====================================================
-- Agent Work Memory System
-- 에이전트가 업무 맥락을 기억하고 이해하기 위한 메모리 시스템
-- =====================================================

-- 에이전트 워크 메모리 테이블
CREATE TABLE IF NOT EXISTS public.agent_work_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.deployed_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- 에이전트 소유자

  -- 메모리 분류
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'task',           -- 업무 수행 기록
    'deliverable',    -- 산출물 생성
    'instruction',    -- 받은 지시사항
    'feedback',       -- 받은 피드백
    'learning',       -- 학습한 내용
    'collaboration',  -- 협업 기록
    'context',        -- 프로젝트/업무 맥락
    'preference',     -- 사용자 선호도
    'mistake',        -- 실수 및 교정
    'decision'        -- 의사결정 근거
  )),

  -- 메모리 내용
  title TEXT NOT NULL,                    -- 요약 제목
  content TEXT NOT NULL,                  -- 상세 내용
  summary TEXT,                           -- AI 생성 요약

  -- 연관 정보
  related_task_id UUID,                   -- 관련 태스크
  related_project_id UUID,                -- 관련 프로젝트
  related_document_id UUID,               -- 관련 문서
  related_agent_ids UUID[],               -- 협업한 에이전트들
  related_conversation_id UUID,           -- 관련 대화

  -- 메타데이터
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),  -- 중요도 (1-10)
  tags TEXT[],                            -- 태그
  metadata JSONB DEFAULT '{}',            -- 추가 메타데이터

  -- 시간 정보
  occurred_at TIMESTAMPTZ DEFAULT NOW(),  -- 발생 시점
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 검색용 컬럼
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'C')
  ) STORED
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_agent ON public.agent_work_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_user ON public.agent_work_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_type ON public.agent_work_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_occurred ON public.agent_work_memory(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_importance ON public.agent_work_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_project ON public.agent_work_memory(related_project_id);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_task ON public.agent_work_memory(related_task_id);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_search ON public.agent_work_memory USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_agent_work_memory_tags ON public.agent_work_memory USING GIN(tags);

-- 에이전트 활성 컨텍스트 (현재 진행 중인 업무)
CREATE TABLE IF NOT EXISTS public.agent_active_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.deployed_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- 현재 컨텍스트
  current_task_id UUID,                   -- 현재 진행 중인 태스크
  current_project_id UUID,                -- 현재 작업 중인 프로젝트
  current_conversation_id UUID,           -- 현재 대화 세션

  -- 최근 맥락 (에이전트가 빠르게 참조할 정보)
  recent_instructions TEXT[],             -- 최근 받은 지시 (최대 10개)
  recent_topics TEXT[],                   -- 최근 다룬 주제들
  pending_tasks TEXT[],                   -- 아직 안 끝난 일들

  -- 사용자 선호도 캐시
  user_preferences JSONB DEFAULT '{}',    -- 사용자가 좋아하는 방식
  communication_style TEXT,               -- 선호하는 소통 방식

  -- 업데이트 시간
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_active_context_agent ON public.agent_active_context(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_active_context_user ON public.agent_active_context(user_id);

-- 에이전트 관계 (다른 에이전트와의 협업 관계)
CREATE TABLE IF NOT EXISTS public.agent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.deployed_agents(id) ON DELETE CASCADE,
  related_agent_id UUID NOT NULL REFERENCES public.deployed_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- 관계 정보
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'collaborator',   -- 동료
    'supervisor',     -- 상사
    'subordinate',    -- 부하
    'specialist'      -- 전문가 (특정 분야 의뢰)
  )),

  -- 협업 통계
  collaboration_count INTEGER DEFAULT 0,   -- 협업 횟수
  last_collaboration TIMESTAMPTZ,          -- 마지막 협업
  collaboration_notes TEXT,                -- 협업 시 주의사항

  -- 평가
  trust_level INTEGER DEFAULT 5 CHECK (trust_level BETWEEN 1 AND 10),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, related_agent_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_relationships_agent ON public.agent_relationships(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_relationships_related ON public.agent_relationships(related_agent_id);

-- RLS 정책
ALTER TABLE public.agent_work_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_active_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_relationships ENABLE ROW LEVEL SECURITY;

-- 워크 메모리 정책
CREATE POLICY "Users can view their agents work memory"
  ON public.agent_work_memory FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their agents work memory"
  ON public.agent_work_memory FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 활성 컨텍스트 정책
CREATE POLICY "Users can manage their agents context"
  ON public.agent_active_context FOR ALL
  USING (user_id = auth.uid());

-- 관계 정책
CREATE POLICY "Users can manage their agents relationships"
  ON public.agent_relationships FOR ALL
  USING (user_id = auth.uid());

-- 워크 메모리 검색 함수
CREATE OR REPLACE FUNCTION search_agent_work_memory(
  p_agent_id UUID,
  p_user_id UUID,
  p_query TEXT,
  p_memory_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  title TEXT,
  content TEXT,
  summary TEXT,
  importance INTEGER,
  occurred_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.memory_type,
    m.title,
    m.content,
    m.summary,
    m.importance,
    m.occurred_at,
    ts_rank(m.search_vector, plainto_tsquery('simple', p_query)) AS rank
  FROM public.agent_work_memory m
  WHERE m.agent_id = p_agent_id
    AND m.user_id = p_user_id
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND m.search_vector @@ plainto_tsquery('simple', p_query)
  ORDER BY rank DESC, m.importance DESC, m.occurred_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 에이전트 최근 컨텍스트 조회 함수
CREATE OR REPLACE FUNCTION get_agent_recent_context(
  p_agent_id UUID,
  p_user_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  memory_type TEXT,
  title TEXT,
  content TEXT,
  importance INTEGER,
  occurred_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.memory_type,
    m.title,
    m.content,
    m.importance,
    m.occurred_at
  FROM public.agent_work_memory m
  WHERE m.agent_id = p_agent_id
    AND m.user_id = p_user_id
    AND m.occurred_at > NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY m.importance DESC, m.occurred_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.agent_work_memory IS '에이전트 워크 메모리 - 업무 맥락을 기억하여 자연스러운 업무 수행 지원';
COMMENT ON TABLE public.agent_active_context IS '에이전트 활성 컨텍스트 - 현재 진행 중인 업무 상태';
COMMENT ON TABLE public.agent_relationships IS '에이전트 관계 - 다른 에이전트와의 협업 관계';
