-- ============================================
-- GitHub Integration Schema
-- ============================================

-- 사용자별 GitHub 연결 정보
CREATE TABLE IF NOT EXISTS user_github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_user_id TEXT NOT NULL,
  github_username TEXT NOT NULL,
  github_email TEXT,
  github_avatar_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT ARRAY['read:user', 'user:email', 'repo'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(github_user_id)
);

-- 프로젝트별 GitHub 레포 연결 필드 추가
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'github_owner') THEN
    ALTER TABLE projects ADD COLUMN github_owner TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'github_repo') THEN
    ALTER TABLE projects ADD COLUMN github_repo TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'github_default_branch') THEN
    ALTER TABLE projects ADD COLUMN github_default_branch TEXT DEFAULT 'main';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'github_clone_url') THEN
    ALTER TABLE projects ADD COLUMN github_clone_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'github_connected_at') THEN
    ALTER TABLE projects ADD COLUMN github_connected_at TIMESTAMPTZ;
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_github_connections_user_id ON user_github_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_github_repo ON projects(github_owner, github_repo) WHERE github_owner IS NOT NULL;

-- RLS 정책
ALTER TABLE user_github_connections ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 GitHub 연결만 조회/수정 가능
CREATE POLICY "Users can view own github connection"
  ON user_github_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own github connection"
  ON user_github_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own github connection"
  ON user_github_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own github connection"
  ON user_github_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Service role은 모든 작업 가능 (API routes에서 사용)
CREATE POLICY "Service role has full access to github connections"
  ON user_github_connections FOR ALL
  USING (auth.role() = 'service_role');

-- Updated at 트리거
CREATE OR REPLACE FUNCTION update_github_connection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_github_connection_updated_at ON user_github_connections;
CREATE TRIGGER trigger_update_github_connection_updated_at
  BEFORE UPDATE ON user_github_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_github_connection_updated_at();
