-- 회의록에 AI 생성 요약 관련 컬럼 추가
-- agent_opinions, next_agenda 저장용

ALTER TABLE meeting_records
  ADD COLUMN IF NOT EXISTS agent_opinions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS next_agenda JSONB DEFAULT '[]'::jsonb;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_meeting_records_created_at
  ON meeting_records(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_records_room_id
  ON meeting_records(room_id);

-- 코멘트 추가
COMMENT ON COLUMN meeting_records.agent_opinions IS '에이전트별 의견 정리 (AI 생성)';
COMMENT ON COLUMN meeting_records.next_agenda IS '다음 회의 안건 제안 (AI 생성)';
COMMENT ON COLUMN meeting_records.summary IS '전체 회의 요약 (AI 생성)';
COMMENT ON COLUMN meeting_records.key_points IS '주요 논의 사항 (AI 생성)';
COMMENT ON COLUMN meeting_records.decisions IS '결정 사항 (AI 생성)';
COMMENT ON COLUMN meeting_records.action_items IS '실행 태스크 (AI 생성)';
COMMENT ON COLUMN meeting_records.risk_register IS '리스크/반대 의견 (AI 생성)';
