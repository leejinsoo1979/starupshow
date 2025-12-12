-- 채팅방에 에이전트 그룹 연동 필드 추가
-- 그룹이 초대되면 해당 그룹의 상호작용 모드가 적용됨

-- chat_rooms 테이블에 그룹 관련 필드 추가
ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS interaction_mode TEXT DEFAULT 'solo'
  CHECK (interaction_mode IN ('solo', 'sequential', 'debate', 'collaborate', 'supervisor')),
ADD COLUMN IF NOT EXISTS agent_group_id UUID REFERENCES agent_groups(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_chat_rooms_agent_group
ON chat_rooms(agent_group_id)
WHERE agent_group_id IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN chat_rooms.interaction_mode IS '에이전트 상호작용 모드 (solo, sequential, debate, collaborate, supervisor)';
COMMENT ON COLUMN chat_rooms.agent_group_id IS '연결된 에이전트 그룹 ID (그룹 초대 시 설정)';
