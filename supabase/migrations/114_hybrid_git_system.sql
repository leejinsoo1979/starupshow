-- ============================================
-- Hybrid Git System
-- 코드: 프로젝트별 독립 레포
-- 문서/디자인/업무: 워크스페이스 통합 레포
-- ============================================

-- 프로젝트 타입 추가
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_type') THEN
    ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'code' CHECK (project_type IN ('code', 'document', 'design', 'work'));
  END IF;

  -- Git 모드: separate_repo(코드용), workspace_repo(통합), local_only(GitHub 안 씀)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'git_mode') THEN
    ALTER TABLE projects ADD COLUMN git_mode TEXT DEFAULT 'local_only' CHECK (git_mode IN ('separate_repo', 'workspace_repo', 'local_only'));
  END IF;

  -- 로컬 Git 경로
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'local_git_path') THEN
    ALTER TABLE projects ADD COLUMN local_git_path TEXT;
  END IF;

  -- 워크스페이스 레포 내 폴더 경로 (workspace_repo 모드일 때)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'workspace_folder') THEN
    ALTER TABLE projects ADD COLUMN workspace_folder TEXT;
  END IF;
END $$;

-- 워크스페이스 통합 레포 테이블
CREATE TABLE IF NOT EXISTS workspace_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'workspace',
  github_owner TEXT,
  github_repo TEXT,
  github_clone_url TEXT,
  github_default_branch TEXT DEFAULT 'main',
  local_path TEXT,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 커밋 로그 테이블 (대시보드 통합 뷰용)
CREATE TABLE IF NOT EXISTS git_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_repo_id UUID REFERENCES workspace_repos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commit_hash TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  files_changed INTEGER DEFAULT 0,
  insertions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  branch TEXT DEFAULT 'main',
  committed_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 브랜치 테이블
CREATE TABLE IF NOT EXISTS git_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_repo_id UUID REFERENCES workspace_repos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  last_commit_hash TEXT,
  last_commit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_workspace_repos_user_id ON workspace_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_project_id ON git_commits(project_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_workspace_repo_id ON git_commits(workspace_repo_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_user_id ON git_commits(user_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_committed_at ON git_commits(committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_git_branches_project_id ON git_branches(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_git_mode ON projects(git_mode);

-- RLS
ALTER TABLE workspace_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_branches ENABLE ROW LEVEL SECURITY;

-- Workspace Repos RLS
CREATE POLICY "Users can view own workspace repos" ON workspace_repos
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own workspace repos" ON workspace_repos
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workspace repos" ON workspace_repos
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own workspace repos" ON workspace_repos
  FOR DELETE USING (user_id = auth.uid());

-- Git Commits RLS
CREATE POLICY "Users can view own commits" ON git_commits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own commits" ON git_commits
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Git Branches RLS
CREATE POLICY "Users can view branches of their projects" ON git_branches
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    OR workspace_repo_id IN (SELECT id FROM workspace_repos WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage branches of their projects" ON git_branches
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    OR workspace_repo_id IN (SELECT id FROM workspace_repos WHERE user_id = auth.uid())
  );

-- Service role 전체 접근
CREATE POLICY "Service role full access workspace_repos" ON workspace_repos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access git_commits" ON git_commits FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access git_branches" ON git_branches FOR ALL USING (auth.role() = 'service_role');
