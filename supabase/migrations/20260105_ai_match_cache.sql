-- AI 매칭 결과 캐시 테이블
-- 동일한 회사 프로필 + 프로그램 조합에 대해 AI 분석 결과를 캐싱

CREATE TABLE IF NOT EXISTS ai_match_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 캐시 키 구성 요소
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES government_programs(id) ON DELETE CASCADE,
  profile_hash TEXT NOT NULL,  -- 프로필 주요 필드 해시 (프로필 변경 감지용)

  -- AI 분석 결과 (JSON)
  ai_result JSONB NOT NULL,

  -- 메타데이터
  model_version TEXT DEFAULT 'grok-4-1-fast',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),  -- 7일 후 만료
  hit_count INTEGER DEFAULT 0,  -- 캐시 히트 횟수 (통계용)

  -- 유니크 제약: 동일 user + program + profile_hash 조합은 하나만
  CONSTRAINT ai_match_cache_unique UNIQUE (user_id, program_id, profile_hash)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_match_cache_lookup
  ON ai_match_cache(user_id, program_id, profile_hash);

CREATE INDEX IF NOT EXISTS idx_ai_match_cache_expires
  ON ai_match_cache(expires_at);

-- RLS 정책
ALTER TABLE ai_match_cache ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 캐시만 조회 가능
CREATE POLICY "Users can view own cache" ON ai_match_cache
  FOR SELECT USING (auth.uid() = user_id);

-- 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role full access" ON ai_match_cache
  FOR ALL USING (auth.role() = 'service_role');

-- 만료된 캐시 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_match_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 코멘트
COMMENT ON TABLE ai_match_cache IS 'AI 매칭 분석 결과 캐시 - 동일 조합 재분석 방지';
COMMENT ON COLUMN ai_match_cache.profile_hash IS '프로필 주요 필드 해시값 - 프로필 변경 시 캐시 무효화';
COMMENT ON COLUMN ai_match_cache.ai_result IS 'AIAnalysisResult JSON 구조';
