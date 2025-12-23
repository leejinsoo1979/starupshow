-- Google Cloud Storage Integration
-- 웹에서 작업할 때 파일 저장용

-- 사용자별 Google Cloud 연결 정보
CREATE TABLE IF NOT EXISTS user_google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  google_email TEXT NOT NULL,
  google_name TEXT,
  google_avatar_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 프로젝트별 GCS 버킷 연결
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gcs_bucket TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gcs_prefix TEXT;  -- 프로젝트별 폴더 경로
ALTER TABLE projects ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'local';  -- 'local' | 'gcs'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gcs_connected_at TIMESTAMPTZ;

-- RLS 정책
ALTER TABLE user_google_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Google connection"
  ON user_google_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Google connection"
  ON user_google_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Google connection"
  ON user_google_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Google connection"
  ON user_google_connections FOR DELETE
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_google_connections_user_id ON user_google_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_storage_type ON projects(storage_type);
