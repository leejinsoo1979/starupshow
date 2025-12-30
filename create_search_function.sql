-- 📚 지식베이스 검색 함수
-- Supabase SQL Editor에서 실행하세요

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
