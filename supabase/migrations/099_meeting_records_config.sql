-- meeting_records에 meeting_config 및 추가 정보 저장
-- 회의 종료 시 모든 설정과 메시지가 함께 저장됨

-- meeting_config JSONB 컬럼 추가
ALTER TABLE meeting_records
ADD COLUMN IF NOT EXISTS meeting_config JSONB DEFAULT '{}'::jsonb;

-- 회의 메시지 전체 저장 (나중에 조회용)
ALTER TABLE meeting_records
ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;

-- 참여 에이전트 목록
ALTER TABLE meeting_records
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;

-- 리스크 레지스터 (MeetingConfig의 outputs.riskRegister)
ALTER TABLE meeting_records
ADD COLUMN IF NOT EXISTS risk_register JSONB DEFAULT '[]'::jsonb;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_meeting_records_created_at ON meeting_records(created_at DESC);

-- 코멘트 추가
COMMENT ON COLUMN meeting_records.meeting_config IS '회의 설정 (purpose, discussionMode, agentConfigs 등)';
COMMENT ON COLUMN meeting_records.messages IS '회의 중 발생한 모든 메시지';
COMMENT ON COLUMN meeting_records.participants IS '참여자 목록 (사용자, 에이전트 정보)';
COMMENT ON COLUMN meeting_records.risk_register IS '도출된 리스크 목록';
