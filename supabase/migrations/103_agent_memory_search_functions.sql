-- =====================================================
-- Agent Memory Search Functions (pgvector)
-- PRD v2.0 Phase 2.3: 메모리 벡터 검색 서비스
-- =====================================================

-- =====================================================
-- 1. 벡터 유사도 검색 함수 (agent_memories)
-- pgvector의 <=> 연산자 사용하여 DB 레벨 검색
-- =====================================================

CREATE OR REPLACE FUNCTION search_agent_memories_by_embedding(
  p_agent_id UUID,
  p_query_embedding vector(1536),
  p_memory_types TEXT[] DEFAULT NULL,
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INTEGER DEFAULT 20,
  -- 접근 범위 필터
  p_relationship_id UUID DEFAULT NULL,
  p_meeting_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL,
  -- 추가 필터
  p_min_importance INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  memory_type TEXT,
  relationship_id UUID,
  meeting_id UUID,
  room_id UUID,
  team_id UUID,
  raw_content TEXT,
  summary TEXT,
  importance INTEGER,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.agent_id,
    m.memory_type,
    m.relationship_id,
    m.meeting_id,
    m.room_id,
    m.team_id,
    m.raw_content,
    m.summary,
    m.importance,
    m.tags,
    m.metadata,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM agent_memories m
  WHERE m.agent_id = p_agent_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> p_query_embedding) >= p_match_threshold
    -- 메모리 타입 필터
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    -- 접근 범위 필터
    AND (p_relationship_id IS NULL OR m.relationship_id = p_relationship_id)
    AND (p_meeting_id IS NULL OR m.meeting_id = p_meeting_id)
    AND (p_team_id IS NULL OR m.team_id = p_team_id)
    AND (p_room_id IS NULL OR m.room_id = p_room_id)
    -- 추가 필터
    AND (p_min_importance IS NULL OR m.importance >= p_min_importance)
    AND (p_tags IS NULL OR m.tags && p_tags)
    AND (p_start_date IS NULL OR m.created_at >= p_start_date)
    AND (p_end_date IS NULL OR m.created_at <= p_end_date)
    -- 아카이브 제외
    AND (m.is_archived IS NULL OR m.is_archived = FALSE)
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$;

-- =====================================================
-- 2. 하이브리드 검색 함수 (시맨틱 + 시간 + 중요도)
-- 가중 합산 점수로 정렬
-- =====================================================

CREATE OR REPLACE FUNCTION hybrid_search_agent_memories(
  p_agent_id UUID,
  p_query_embedding vector(1536),
  p_memory_types TEXT[] DEFAULT NULL,
  p_match_count INTEGER DEFAULT 20,
  -- 가중치 (합이 1.0)
  p_weight_semantic FLOAT DEFAULT 0.5,
  p_weight_recency FLOAT DEFAULT 0.3,
  p_weight_importance FLOAT DEFAULT 0.2,
  -- 접근 범위 필터
  p_relationship_id UUID DEFAULT NULL,
  p_meeting_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  -- 추가 필터
  p_min_importance INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_days_limit INTEGER DEFAULT 30  -- 최근 N일 기준
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  memory_type TEXT,
  relationship_id UUID,
  meeting_id UUID,
  room_id UUID,
  team_id UUID,
  raw_content TEXT,
  summary TEXT,
  importance INTEGER,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ,
  similarity FLOAT,
  recency_score FLOAT,
  importance_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_days_ago TIMESTAMPTZ := NOW() - (p_days_limit || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH scored AS (
    SELECT
      m.id,
      m.agent_id,
      m.memory_type,
      m.relationship_id,
      m.meeting_id,
      m.room_id,
      m.team_id,
      m.raw_content,
      m.summary,
      m.importance,
      m.tags,
      m.metadata,
      m.created_at,
      -- 시맨틱 유사도 (0-1)
      1 - (m.embedding <=> p_query_embedding) AS similarity,
      -- 시간 근접성 (0-1, 최근일수록 높음)
      GREATEST(0, 1 - EXTRACT(EPOCH FROM (v_now - m.created_at)) / EXTRACT(EPOCH FROM (v_now - v_days_ago))) AS recency_score,
      -- 중요도 점수 (0-1)
      m.importance::FLOAT / 10.0 AS importance_score
    FROM agent_memories m
    WHERE m.agent_id = p_agent_id
      AND m.embedding IS NOT NULL
      -- 메모리 타입 필터
      AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
      -- 접근 범위 필터
      AND (p_relationship_id IS NULL OR m.relationship_id = p_relationship_id)
      AND (p_meeting_id IS NULL OR m.meeting_id = p_meeting_id)
      AND (p_team_id IS NULL OR m.team_id = p_team_id)
      -- 추가 필터
      AND (p_min_importance IS NULL OR m.importance >= p_min_importance)
      AND (p_tags IS NULL OR m.tags && p_tags)
      -- 아카이브 제외
      AND (m.is_archived IS NULL OR m.is_archived = FALSE)
  )
  SELECT
    s.id,
    s.agent_id,
    s.memory_type,
    s.relationship_id,
    s.meeting_id,
    s.room_id,
    s.team_id,
    s.raw_content,
    s.summary,
    s.importance,
    s.tags,
    s.metadata,
    s.created_at,
    s.similarity,
    s.recency_score,
    s.importance_score,
    -- 가중 합산 점수
    (s.similarity * p_weight_semantic +
     s.recency_score * p_weight_recency +
     s.importance_score * p_weight_importance) AS combined_score
  FROM scored s
  WHERE s.similarity >= 0.3  -- 최소 시맨틱 임계값
  ORDER BY combined_score DESC
  LIMIT p_match_count;
END;
$$;

-- =====================================================
-- 3. 지식베이스 검색 함수 (agent_knowledge_base)
-- =====================================================

CREATE OR REPLACE FUNCTION search_agent_knowledge_base(
  p_agent_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INTEGER DEFAULT 10,
  p_category TEXT DEFAULT NULL,
  p_access_level TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  title TEXT,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  category TEXT,
  access_level TEXT,
  tags TEXT[],
  metadata JSONB,
  chunk_index INTEGER,
  total_chunks INTEGER,
  parent_doc_id UUID,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.agent_id,
    kb.title,
    kb.content,
    kb.file_url,
    kb.file_type,
    kb.category,
    kb.access_level,
    kb.tags,
    kb.metadata,
    kb.chunk_index,
    kb.total_chunks,
    kb.parent_doc_id,
    kb.created_at,
    1 - (kb.embedding <=> p_query_embedding) AS similarity
  FROM agent_knowledge_base kb
  WHERE kb.agent_id = p_agent_id
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> p_query_embedding) >= p_match_threshold
    AND (p_category IS NULL OR kb.category = p_category)
    AND (p_access_level IS NULL OR kb.access_level = p_access_level)
    AND (p_tags IS NULL OR kb.tags && p_tags)
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$;

-- =====================================================
-- 4. 권한 필터 함수 (Permission Checker)
-- 사용자가 접근 가능한 메모리만 반환
-- =====================================================

CREATE OR REPLACE FUNCTION filter_memories_by_permission(
  p_agent_id UUID,
  p_user_id UUID,
  p_memory_ids UUID[]
)
RETURNS TABLE (
  memory_id UUID,
  has_access BOOLEAN,
  access_reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_team_id UUID;
BEGIN
  -- 에이전트 소유자인지 확인
  SELECT EXISTS (
    SELECT 1 FROM deployed_agents
    WHERE id = p_agent_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  -- 에이전트 팀 ID
  SELECT team_id INTO v_team_id
  FROM deployed_agents
  WHERE id = p_agent_id;

  RETURN QUERY
  SELECT
    m.id AS memory_id,
    CASE
      -- 소유자는 모든 메모리 접근 가능
      WHEN v_is_owner THEN TRUE
      -- private: 관계 당사자만
      WHEN m.memory_type = 'private' THEN
        EXISTS (
          SELECT 1 FROM agent_relationships ar
          WHERE ar.id = m.relationship_id
          AND ar.partner_user_id = p_user_id
        )
      -- meeting: 미팅 참가자만
      WHEN m.memory_type = 'meeting' THEN
        EXISTS (
          SELECT 1 FROM meeting_records mr
          WHERE mr.id = m.meeting_id
          AND (
            mr.created_by = p_user_id
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(mr.participants) p
              WHERE (p->>'id')::uuid = p_user_id
            )
          )
        )
      -- team: 팀원만
      WHEN m.memory_type = 'team' THEN
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = m.team_id
          AND tm.user_id = p_user_id
        )
      -- injected, execution: 소유자만
      ELSE FALSE
    END AS has_access,
    CASE
      WHEN v_is_owner THEN 'owner'
      WHEN m.memory_type = 'private' THEN 'relationship_partner'
      WHEN m.memory_type = 'meeting' THEN 'meeting_participant'
      WHEN m.memory_type = 'team' THEN 'team_member'
      ELSE 'no_access'
    END AS access_reason
  FROM agent_memories m
  WHERE m.id = ANY(p_memory_ids);
END;
$$;

-- =====================================================
-- 5. 연관 메모리 검색 (Knowledge Graph)
-- 특정 메모리와 연결된 메모리들 조회
-- =====================================================

CREATE OR REPLACE FUNCTION get_linked_memories(
  p_memory_id UUID,
  p_depth INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  memory_type TEXT,
  raw_content TEXT,
  summary TEXT,
  importance INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  link_depth INTEGER,
  linked_from UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE linked AS (
    -- 시작점
    SELECT
      m.id,
      m.agent_id,
      m.memory_type,
      m.raw_content,
      m.summary,
      m.importance,
      m.tags,
      m.created_at,
      m.linked_memory_ids,
      0 AS depth,
      NULL::UUID AS linked_from
    FROM agent_memories m
    WHERE m.id = p_memory_id

    UNION ALL

    -- 연결된 메모리 탐색
    SELECT
      m.id,
      m.agent_id,
      m.memory_type,
      m.raw_content,
      m.summary,
      m.importance,
      m.tags,
      m.created_at,
      m.linked_memory_ids,
      l.depth + 1,
      l.id AS linked_from
    FROM linked l
    CROSS JOIN LATERAL unnest(l.linked_memory_ids) AS linked_id
    JOIN agent_memories m ON m.id = linked_id
    WHERE l.depth < p_depth
  )
  SELECT
    l.id,
    l.agent_id,
    l.memory_type,
    l.raw_content,
    l.summary,
    l.importance,
    l.tags,
    l.created_at,
    l.depth AS link_depth,
    l.linked_from
  FROM linked l
  WHERE l.id != p_memory_id  -- 시작점 제외
  ORDER BY l.depth, l.created_at DESC;
END;
$$;

-- =====================================================
-- 6. 메모리 그래프 데이터 생성 (3D 시각화용)
-- 노드와 엣지 반환
-- =====================================================

CREATE OR REPLACE FUNCTION get_memory_graph_data(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_memory_types TEXT[] DEFAULT NULL,
  p_min_importance INTEGER DEFAULT 5
)
RETURNS TABLE (
  nodes JSONB,
  edges JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_nodes JSONB;
  v_edges JSONB;
BEGIN
  -- 노드 생성
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'type', m.memory_type,
      'label', COALESCE(m.summary, LEFT(m.raw_content, 50) || '...'),
      'importance', m.importance,
      'tags', m.tags,
      'created_at', m.created_at
    )
  )
  INTO v_nodes
  FROM (
    SELECT *
    FROM agent_memories
    WHERE agent_id = p_agent_id
      AND (p_memory_types IS NULL OR memory_type = ANY(p_memory_types))
      AND importance >= p_min_importance
      AND (is_archived IS NULL OR is_archived = FALSE)
    ORDER BY created_at DESC
    LIMIT p_limit
  ) m;

  -- 엣지 생성 (linked_memory_ids 기반)
  SELECT jsonb_agg(
    jsonb_build_object(
      'source', m.id,
      'target', linked_id,
      'type', 'linked'
    )
  )
  INTO v_edges
  FROM (
    SELECT id, unnest(linked_memory_ids) AS linked_id
    FROM agent_memories
    WHERE agent_id = p_agent_id
      AND cardinality(linked_memory_ids) > 0
      AND (is_archived IS NULL OR is_archived = FALSE)
  ) m
  WHERE linked_id IN (
    SELECT id FROM agent_memories
    WHERE agent_id = p_agent_id
  );

  RETURN QUERY SELECT
    COALESCE(v_nodes, '[]'::jsonb) AS nodes,
    COALESCE(v_edges, '[]'::jsonb) AS edges;
END;
$$;

-- =====================================================
-- 7. 풀텍스트 검색 함수 (tsvector 활용)
-- =====================================================

CREATE OR REPLACE FUNCTION fulltext_search_agent_memories(
  p_agent_id UUID,
  p_search_query TEXT,
  p_memory_types TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_relationship_id UUID DEFAULT NULL,
  p_meeting_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  memory_type TEXT,
  raw_content TEXT,
  summary TEXT,
  importance INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tsquery tsquery;
BEGIN
  -- 검색어를 tsquery로 변환
  v_tsquery := plainto_tsquery('korean', p_search_query);

  RETURN QUERY
  SELECT
    m.id,
    m.agent_id,
    m.memory_type,
    m.raw_content,
    m.summary,
    m.importance,
    m.tags,
    m.created_at,
    ts_rank(m.search_text, v_tsquery) AS rank
  FROM agent_memories m
  WHERE m.agent_id = p_agent_id
    AND m.search_text @@ v_tsquery
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND (p_relationship_id IS NULL OR m.relationship_id = p_relationship_id)
    AND (p_meeting_id IS NULL OR m.meeting_id = p_meeting_id)
    AND (p_team_id IS NULL OR m.team_id = p_team_id)
    AND (m.is_archived IS NULL OR m.is_archived = FALSE)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 인덱스 최적화: HNSW 인덱스 추가 (더 빠른 검색)
-- IVFFlat보다 약간 더 많은 메모리 사용하지만 더 빠름
-- =====================================================

-- 기존 IVFFlat 인덱스 유지하고 HNSW 추가 (선택적)
-- CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding_hnsw
-- ON agent_memories USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON FUNCTION search_agent_memories_by_embedding IS '에이전트 메모리 벡터 유사도 검색 (pgvector)';
COMMENT ON FUNCTION hybrid_search_agent_memories IS '하이브리드 검색: 시맨틱 + 시간 근접성 + 중요도';
COMMENT ON FUNCTION search_agent_knowledge_base IS '지식베이스 벡터 검색';
COMMENT ON FUNCTION filter_memories_by_permission IS '사용자별 메모리 접근 권한 필터';
COMMENT ON FUNCTION get_linked_memories IS '연결된 메모리 재귀 조회 (지식 그래프)';
COMMENT ON FUNCTION get_memory_graph_data IS '메모리 그래프 시각화 데이터 생성';
COMMENT ON FUNCTION fulltext_search_agent_memories IS '풀텍스트 검색 (한국어 tsvector)';
