-- Project Activities 테이블 생성
-- 프로젝트 활동 로그 (태스크 완료, 멤버 합류, 에이전트 활동 등)

CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 활동 유형
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'task_completed',
    'task_created',
    'comment',
    'document',
    'member_joined',
    'agent_action',
    'milestone',
    'announcement',
    'file_created',
    'file_modified',
    'commit',
    'status_changed'
  )),

  -- 활동 내용
  title TEXT NOT NULL,
  description TEXT,

  -- 수행자 (사용자 또는 에이전트)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES deployed_agents(id) ON DELETE SET NULL,

  -- 메타데이터 (추가 정보)
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 인덱스용
  CONSTRAINT activity_has_actor CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

-- 인덱스 생성
CREATE INDEX idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX idx_project_activities_type ON project_activities(type);
CREATE INDEX idx_project_activities_created_at ON project_activities(created_at DESC);
CREATE INDEX idx_project_activities_user_id ON project_activities(user_id);
CREATE INDEX idx_project_activities_agent_id ON project_activities(agent_id);

-- RLS 활성화
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 멤버만 활동 조회 가능
CREATE POLICY "Project members can view activities"
  ON project_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_activities.project_id
      AND pm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_activities.project_id
      AND p.created_by = auth.uid()
    )
  );

-- RLS 정책: 프로젝트 멤버만 활동 생성 가능
CREATE POLICY "Project members can create activities"
  ON project_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_activities.project_id
      AND pm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_activities.project_id
      AND p.created_by = auth.uid()
    )
  );

-- 활동 생성 함수 (트리거용)
CREATE OR REPLACE FUNCTION log_project_activity(
  p_project_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO project_activities (project_id, type, title, description, user_id, agent_id, metadata)
  VALUES (p_project_id, p_type, p_title, p_description, COALESCE(p_user_id, auth.uid()), p_agent_id, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 태스크 완료 시 자동 활동 기록 트리거
CREATE OR REPLACE FUNCTION trigger_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- 태스크 생성
  IF TG_OP = 'INSERT' THEN
    PERFORM log_project_activity(
      NEW.project_id,
      'task_created',
      NEW.title,
      NEW.description,
      NEW.created_by
    );
  END IF;

  -- 태스크 완료
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM log_project_activity(
      NEW.project_id,
      'task_completed',
      NEW.title,
      NULL,
      NEW.assigned_to
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- tasks 테이블에 트리거 연결 (테이블이 존재하는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;
    CREATE TRIGGER task_activity_trigger
      AFTER INSERT OR UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION trigger_task_activity();
  END IF;
END $$;

-- 멤버 합류 시 자동 활동 기록 트리거
CREATE OR REPLACE FUNCTION trigger_member_joined_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT name INTO v_user_name FROM users WHERE id = NEW.user_id;

  PERFORM log_project_activity(
    NEW.project_id,
    'member_joined',
    COALESCE(v_user_name, '새 멤버') || '님이 프로젝트에 참여했습니다',
    NULL,
    NEW.user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- project_members 테이블에 트리거 연결
DROP TRIGGER IF EXISTS member_joined_activity_trigger ON project_members;
CREATE TRIGGER member_joined_activity_trigger
  AFTER INSERT ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_member_joined_activity();
