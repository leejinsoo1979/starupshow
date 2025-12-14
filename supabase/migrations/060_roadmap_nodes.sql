-- =====================================================
-- Node-based AI Agent Roadmap System
-- 단순화된 버전: Node Agent만, AI 보조 + 인간 실행
-- =====================================================

-- Node 상태 enum
CREATE TYPE node_status AS ENUM (
  'pending',      -- 대기 (의존성 미충족)
  'ready',        -- 준비 완료 (실행 가능)
  'running',      -- 실행 중
  'completed',    -- 완료
  'failed',       -- 실패
  'paused'        -- 일시 중지
);

-- 자동화 수준 enum
CREATE TYPE automation_level AS ENUM (
  'full',         -- 완전 자동 (단순 작업에만)
  'assisted',     -- AI 보조 + 인간 승인
  'manual'        -- 수동 (AI 추천만)
);

-- Node 에이전트 유형
CREATE TYPE node_agent_type AS ENUM (
  'planner',      -- 기획
  'designer',     -- 디자인
  'developer',    -- 개발
  'qa',           -- 테스트/QA
  'content',      -- 콘텐츠 작성
  'research',     -- 리서치
  'data',         -- 데이터 분석
  'general'       -- 범용
);

-- =====================================================
-- 로드맵 노드 테이블
-- =====================================================
CREATE TABLE roadmap_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT,
  goal TEXT,                          -- 노드의 목표

  -- 위치 (시각화용)
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,

  -- 에이전트 설정
  agent_type node_agent_type DEFAULT 'general',
  assigned_agent_id UUID REFERENCES deployed_agents(id),  -- 배정된 AI 에이전트

  -- 상태 및 자동화
  status node_status DEFAULT 'pending',
  automation_level automation_level DEFAULT 'assisted',

  -- 입출력 정의
  input_schema JSONB DEFAULT '{}',    -- 예상 입력 형식
  output_schema JSONB DEFAULT '{}',   -- 예상 출력 형식
  input_data JSONB,                   -- 실제 입력 데이터
  output_data JSONB,                  -- 실제 출력 결과

  -- AI 보조 결과
  ai_suggestion TEXT,                 -- AI가 생성한 추천/초안
  ai_analysis JSONB,                  -- AI 분석 결과

  -- 실행 정보
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  error_message TEXT,

  -- 메타데이터
  priority INT DEFAULT 0,             -- 우선순위 (높을수록 먼저)
  estimated_hours FLOAT,              -- 예상 소요 시간
  actual_hours FLOAT,                 -- 실제 소요 시간

  -- 담당자 (인간)
  assignee_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 노드 의존성 테이블 (DAG 엣지)
-- =====================================================
CREATE TABLE node_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_node_id UUID NOT NULL REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES roadmap_nodes(id) ON DELETE CASCADE,

  -- 의존성 유형
  dependency_type VARCHAR(50) DEFAULT 'finish_to_start',  -- finish_to_start, start_to_start 등

  -- 조건 (선택적)
  condition JSONB,                    -- 추가 트리거 조건

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 방지
  UNIQUE(source_node_id, target_node_id),

  -- 자기 참조 방지
  CHECK (source_node_id != target_node_id)
);

-- =====================================================
-- 노드 실행 로그
-- =====================================================
CREATE TABLE node_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES roadmap_nodes(id) ON DELETE CASCADE,

  -- 로그 정보
  log_type VARCHAR(50) NOT NULL,      -- 'info', 'warning', 'error', 'ai_response', 'user_action'
  message TEXT NOT NULL,
  details JSONB,

  -- AI 관련
  ai_model VARCHAR(100),              -- 사용된 AI 모델
  tokens_used INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 인덱스
-- =====================================================
CREATE INDEX idx_roadmap_nodes_project ON roadmap_nodes(project_id);
CREATE INDEX idx_roadmap_nodes_status ON roadmap_nodes(status);
CREATE INDEX idx_roadmap_nodes_assignee ON roadmap_nodes(assignee_id);
CREATE INDEX idx_node_dependencies_source ON node_dependencies(source_node_id);
CREATE INDEX idx_node_dependencies_target ON node_dependencies(target_node_id);
CREATE INDEX idx_node_execution_logs_node ON node_execution_logs(node_id);

-- =====================================================
-- 트리거: updated_at 자동 갱신
-- =====================================================
CREATE OR REPLACE FUNCTION update_roadmap_node_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_nodes_updated_at
  BEFORE UPDATE ON roadmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_node_timestamp();

-- =====================================================
-- 함수: 노드 준비 상태 체크
-- 모든 선행 노드가 완료되면 'ready'로 변경
-- =====================================================
CREATE OR REPLACE FUNCTION check_node_readiness()
RETURNS TRIGGER AS $$
DECLARE
  dependent_node RECORD;
  all_deps_complete BOOLEAN;
BEGIN
  -- 완료된 노드의 후속 노드들 확인
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    FOR dependent_node IN
      SELECT DISTINCT rn.*
      FROM roadmap_nodes rn
      JOIN node_dependencies nd ON nd.target_node_id = rn.id
      WHERE nd.source_node_id = NEW.id
      AND rn.status = 'pending'
    LOOP
      -- 해당 후속 노드의 모든 의존성이 완료되었는지 확인
      SELECT NOT EXISTS (
        SELECT 1
        FROM node_dependencies nd
        JOIN roadmap_nodes rn ON rn.id = nd.source_node_id
        WHERE nd.target_node_id = dependent_node.id
        AND rn.status != 'completed'
      ) INTO all_deps_complete;

      -- 모든 의존성 완료 시 ready로 변경
      IF all_deps_complete THEN
        UPDATE roadmap_nodes
        SET status = 'ready'
        WHERE id = dependent_node.id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_node_readiness_trigger
  AFTER UPDATE ON roadmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION check_node_readiness();

-- =====================================================
-- 함수: 의존성 없는 노드 자동 ready 설정
-- =====================================================
CREATE OR REPLACE FUNCTION set_initial_node_ready()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 노드가 의존성이 없으면 바로 ready
  IF NOT EXISTS (
    SELECT 1 FROM node_dependencies WHERE target_node_id = NEW.id
  ) THEN
    NEW.status = 'ready';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_initial_node_ready_trigger
  BEFORE INSERT ON roadmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_node_ready();

-- =====================================================
-- RLS 정책
-- =====================================================
ALTER TABLE roadmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_execution_logs ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버만 접근 가능
CREATE POLICY "Project members can view nodes" ON roadmap_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = roadmap_nodes.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can manage nodes" ON roadmap_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = roadmap_nodes.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view dependencies" ON node_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roadmap_nodes rn
      JOIN project_members pm ON pm.project_id = rn.project_id
      WHERE rn.id = node_dependencies.source_node_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can manage dependencies" ON node_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roadmap_nodes rn
      JOIN project_members pm ON pm.project_id = rn.project_id
      WHERE rn.id = node_dependencies.source_node_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can view logs" ON node_execution_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roadmap_nodes rn
      JOIN project_members pm ON pm.project_id = rn.project_id
      WHERE rn.id = node_execution_logs.node_id
      AND pm.user_id = auth.uid()
    )
  );
