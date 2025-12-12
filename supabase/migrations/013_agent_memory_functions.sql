-- =====================================================
-- Agent Memory System: RPC Functions
-- 시맨틱 검색 및 자동화 함수들
-- =====================================================

-- 1. 지식 시맨틱 검색
CREATE OR REPLACE FUNCTION match_agent_knowledge(
  agent_id_input UUID,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  knowledge_type TEXT,
  subject TEXT,
  content TEXT,
  confidence DECIMAL,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.knowledge_type,
    ak.subject,
    ak.content,
    ak.confidence,
    1 - (ak.embedding <=> query_embedding) AS similarity
  FROM agent_knowledge ak
  WHERE ak.agent_id = agent_id_input
    AND ak.embedding IS NOT NULL
    AND 1 - (ak.embedding <=> query_embedding) > match_threshold
  ORDER BY ak.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. 업무 로그 시맨틱 검색
CREATE OR REPLACE FUNCTION match_agent_logs(
  agent_id_input UUID,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  log_type TEXT,
  title TEXT,
  content TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    awl.id,
    awl.log_type,
    awl.title,
    awl.content,
    awl.summary,
    awl.created_at,
    1 - (awl.embedding <=> query_embedding) AS similarity
  FROM agent_work_logs awl
  WHERE awl.agent_id = agent_id_input
    AND awl.embedding IS NOT NULL
    AND 1 - (awl.embedding <=> query_embedding) > match_threshold
  ORDER BY awl.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. 특정 채팅방에서의 에이전트 활동 요약
CREATE OR REPLACE FUNCTION get_agent_room_summary(
  agent_id_input UUID,
  room_id_input UUID
)
RETURNS TABLE (
  total_messages BIGINT,
  first_interaction TIMESTAMPTZ,
  last_interaction TIMESTAMPTZ,
  main_topics TEXT[],
  decision_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_messages,
    MIN(created_at) AS first_interaction,
    MAX(created_at) AS last_interaction,
    ARRAY(
      SELECT DISTINCT unnest(tags)
      FROM agent_work_logs
      WHERE agent_id = agent_id_input AND room_id = room_id_input
      LIMIT 10
    ) AS main_topics,
    (
      SELECT COUNT(*)
      FROM agent_work_logs
      WHERE agent_id = agent_id_input
        AND room_id = room_id_input
        AND log_type = 'decision'
    ) AS decision_count
  FROM agent_work_logs
  WHERE agent_id = agent_id_input AND room_id = room_id_input;
END;
$$;

-- 4. 에이전트 간 상호작용 통계
CREATE OR REPLACE FUNCTION get_agent_interactions(
  agent_id_input UUID
)
RETURNS TABLE (
  other_agent_id UUID,
  interaction_count BIGINT,
  last_interaction TIMESTAMPTZ,
  collaboration_topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(related_agent_ids) AS other_agent_id,
    COUNT(*) AS interaction_count,
    MAX(created_at) AS last_interaction,
    ARRAY_AGG(DISTINCT unnest(tags)) AS collaboration_topics
  FROM agent_work_logs
  WHERE agent_id = agent_id_input
    AND array_length(related_agent_ids, 1) > 0
  GROUP BY unnest(related_agent_ids)
  ORDER BY interaction_count DESC;
END;
$$;

-- 5. 자동 일간 커밋 생성 트리거 (매일 자정)
-- 참고: 실제 사용 시 pg_cron 확장 필요
-- SELECT cron.schedule('daily-agent-commits', '0 0 * * *', $$
--   SELECT create_daily_commits();
-- $$);

CREATE OR REPLACE FUNCTION create_daily_commits()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  agent_record RECORD;
  yesterday_start TIMESTAMPTZ;
  yesterday_end TIMESTAMPTZ;
BEGIN
  yesterday_start := date_trunc('day', NOW() - INTERVAL '1 day');
  yesterday_end := yesterday_start + INTERVAL '1 day' - INTERVAL '1 second';

  -- 모든 활성 에이전트에 대해
  FOR agent_record IN
    SELECT DISTINCT agent_id
    FROM agent_work_logs
    WHERE created_at >= yesterday_start AND created_at <= yesterday_end
  LOOP
    -- 이미 커밋이 있는지 확인
    IF NOT EXISTS (
      SELECT 1 FROM agent_commits
      WHERE agent_id = agent_record.agent_id
        AND commit_type = 'daily'
        AND period_start = yesterday_start
    ) THEN
      -- 커밋 생성 (실제 요약은 애플리케이션에서 처리)
      INSERT INTO agent_commits (
        agent_id,
        commit_type,
        period_start,
        period_end,
        title,
        summary,
        stats,
        log_ids
      )
      SELECT
        agent_record.agent_id,
        'daily',
        yesterday_start,
        yesterday_end,
        '일간 업무 요약 (자동 생성 대기)',
        '요약 생성 중...',
        jsonb_build_object(
          'conversations', COUNT(*) FILTER (WHERE log_type = 'conversation'),
          'decisions', COUNT(*) FILTER (WHERE log_type = 'decision'),
          'tasks', COUNT(*) FILTER (WHERE log_type = 'task_work'),
          'collaborations', COUNT(*) FILTER (WHERE log_type = 'collaboration')
        ),
        ARRAY_AGG(id)
      FROM agent_work_logs
      WHERE agent_id = agent_record.agent_id
        AND created_at >= yesterday_start
        AND created_at <= yesterday_end;
    END IF;
  END LOOP;
END;
$$;

-- 6. 컨텍스트 스냅샷 자동 정리 (7일 이상 된 스냅샷 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM agent_context_snapshots
  WHERE (expires_at IS NOT NULL AND expires_at < NOW())
     OR (expires_at IS NULL AND created_at < NOW() - INTERVAL '7 days');
END;
$$;

-- 7. 에이전트 통계 업데이트
CREATE OR REPLACE FUNCTION update_agent_identity_stats(agent_id_input UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE agent_identity
  SET
    total_conversations = (
      SELECT COUNT(*) FROM agent_work_logs
      WHERE agent_id = agent_id_input AND log_type = 'conversation'
    ),
    total_tasks_completed = (
      SELECT COUNT(*) FROM agent_work_logs
      WHERE agent_id = agent_id_input AND log_type = 'task_work'
    ),
    total_decisions_made = (
      SELECT COUNT(*) FROM agent_work_logs
      WHERE agent_id = agent_id_input AND log_type = 'decision'
    ),
    updated_at = NOW()
  WHERE agent_id = agent_id_input;
END;
$$;

-- =====================================================
-- 권한 설정
-- =====================================================

GRANT EXECUTE ON FUNCTION match_agent_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION match_agent_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_room_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_interactions TO authenticated;
GRANT EXECUTE ON FUNCTION update_agent_identity_stats TO authenticated;
