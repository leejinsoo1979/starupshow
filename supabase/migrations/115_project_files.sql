-- Project Files System
-- 프로젝트에 속한 파일들을 저장

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 파일 정보
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT,  -- 파일 내용 (텍스트 파일인 경우)

  -- 메타데이터
  file_type TEXT,  -- html, js, ts, css, md 등
  file_size INTEGER,

  -- 생성자
  created_by_agent_id UUID REFERENCES deployed_agents(id) ON DELETE SET NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_file_name ON project_files(file_name);

-- RLS 활성화
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to project_files" ON project_files
  FOR ALL USING (true) WITH CHECK (true);

-- Select: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view project_files" ON project_files
  FOR SELECT USING (true);

-- Updated_at 트리거
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_files_updated_at
    BEFORE UPDATE ON project_files
    FOR EACH ROW
    EXECUTE FUNCTION update_project_files_updated_at();
