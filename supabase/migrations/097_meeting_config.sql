-- 회의 설정 (meeting_config) 컬럼 추가
-- purpose, discussionMode, allowDebate, failureResolution 등 저장

ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS meeting_config JSONB DEFAULT NULL;

COMMENT ON COLUMN chat_rooms.meeting_config IS '회의 설정 (purpose, discussionMode, allowDebate, failureResolution, agentConfigs 등)';

-- 인덱스 추가 (JSONB 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_meeting_config ON chat_rooms USING GIN (meeting_config);
