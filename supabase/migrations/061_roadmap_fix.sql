-- =====================================================
-- Roadmap FK and RLS Fix
-- auth.users → public.users 참조 변경 및 RLS 단순화
-- =====================================================

-- 1. 기존 FK 제약조건 삭제
ALTER TABLE roadmap_nodes DROP CONSTRAINT IF EXISTS roadmap_nodes_assignee_id_fkey;
ALTER TABLE roadmap_nodes DROP CONSTRAINT IF EXISTS roadmap_nodes_created_by_fkey;
ALTER TABLE node_execution_logs DROP CONSTRAINT IF EXISTS node_execution_logs_created_by_fkey;

-- 2. public.users를 참조하도록 FK 재생성 (nullable이므로 SET NULL)
ALTER TABLE roadmap_nodes
  ADD CONSTRAINT roadmap_nodes_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE roadmap_nodes
  ADD CONSTRAINT roadmap_nodes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE node_execution_logs
  ADD CONSTRAINT node_execution_logs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Project members can view nodes" ON roadmap_nodes;
DROP POLICY IF EXISTS "Project members can manage nodes" ON roadmap_nodes;
DROP POLICY IF EXISTS "Project members can view dependencies" ON node_dependencies;
DROP POLICY IF EXISTS "Project members can manage dependencies" ON node_dependencies;
DROP POLICY IF EXISTS "Project members can view logs" ON node_execution_logs;

-- 4. 개발 단계에서는 RLS 비활성화 (production에서는 다시 활성화 필요)
ALTER TABLE roadmap_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE node_dependencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE node_execution_logs DISABLE ROW LEVEL SECURITY;

-- 5. 단순한 RLS 정책 생성 (나중에 활성화할 때 사용)
-- 팀 멤버 기반 접근 (project_members 대신 team_members 사용)
CREATE POLICY "Team members can access nodes" ON roadmap_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = roadmap_nodes.project_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access dependencies" ON node_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roadmap_nodes rn
      JOIN projects p ON p.id = rn.project_id
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE rn.id = node_dependencies.source_node_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access logs" ON node_execution_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roadmap_nodes rn
      JOIN projects p ON p.id = rn.project_id
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE rn.id = node_execution_logs.node_id
      AND tm.user_id = auth.uid()
    )
  );

-- 개발 완료 후 RLS 활성화:
-- ALTER TABLE roadmap_nodes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE node_dependencies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE node_execution_logs ENABLE ROW LEVEL SECURITY;
