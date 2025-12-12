-- Agent Interaction Configuration
-- 에이전트 상호작용 설정을 위한 스키마 업데이트

-- 상호작용 모드 ENUM 타입 생성
DO $$ BEGIN
  CREATE TYPE interaction_mode AS ENUM ('solo', 'sequential', 'debate', 'collaborate', 'supervisor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- LLM 제공자 ENUM 타입 생성
DO $$ BEGIN
  CREATE TYPE llm_provider AS ENUM ('openai', 'qwen');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- deployed_agents 테이블에 상호작용 설정 컬럼 추가
ALTER TABLE deployed_agents
ADD COLUMN IF NOT EXISTS interaction_mode interaction_mode DEFAULT 'solo',
ADD COLUMN IF NOT EXISTS llm_provider llm_provider DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'gpt-4',
ADD COLUMN IF NOT EXISTS speak_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS collaborates_with UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES deployed_agents(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_deployed_agents_interaction_mode
ON deployed_agents(interaction_mode);

CREATE INDEX IF NOT EXISTS idx_deployed_agents_supervisor
ON deployed_agents(supervisor_id);

-- 에이전트 그룹 테이블 (협업 그룹 관리용)
CREATE TABLE IF NOT EXISTS agent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  interaction_mode interaction_mode DEFAULT 'collaborate',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 에이전트 그룹 멤버십
CREATE TABLE IF NOT EXISTS agent_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES agent_groups(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES deployed_agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'supervisor', 'member'
  speak_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, agent_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_groups_team
ON agent_groups(team_id);

CREATE INDEX IF NOT EXISTS idx_agent_group_members_group
ON agent_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_agent_group_members_agent
ON agent_group_members(agent_id);

-- RLS 정책
ALTER TABLE agent_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_group_members ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 정책 (간단화)
CREATE POLICY "agent_groups_authenticated_access" ON agent_groups
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "agent_group_members_authenticated_access" ON agent_group_members
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION update_agent_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_groups_updated_at ON agent_groups;
CREATE TRIGGER trigger_agent_groups_updated_at
  BEFORE UPDATE ON agent_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_groups_updated_at();

-- 코멘트
COMMENT ON TABLE agent_groups IS '에이전트 협업 그룹';
COMMENT ON TABLE agent_group_members IS '에이전트 그룹 멤버십';
COMMENT ON COLUMN deployed_agents.interaction_mode IS '상호작용 모드: solo, sequential, debate, collaborate, supervisor';
COMMENT ON COLUMN deployed_agents.llm_provider IS 'LLM 제공자: openai, qwen';
COMMENT ON COLUMN deployed_agents.speak_order IS '순차 모드에서 발언 순서';
COMMENT ON COLUMN deployed_agents.collaborates_with IS '협업 대상 에이전트 ID 목록';
COMMENT ON COLUMN deployed_agents.supervisor_id IS '감독자 에이전트 ID';
