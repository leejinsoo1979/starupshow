-- 프로젝트 카테고리 테이블
CREATE TABLE IF NOT EXISTS project_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT '#8B5CF6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
  ON project_categories FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own categories"
  ON project_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON project_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON project_categories FOR DELETE
  USING (auth.uid() = user_id);

-- 기본 카테고리 추가 (전역)
INSERT INTO project_categories (id, user_id, name, description, icon, color, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, '개발', '코드 프로젝트', 'Code', '#10b981', 0),
  ('22222222-2222-2222-2222-222222222222', NULL, '문서', '기획 & 문서', 'FileText', '#3b82f6', 1),
  ('33333333-3333-3333-3333-333333333333', NULL, '디자인', 'UI/UX & 그래픽', 'Palette', '#8b5cf6', 2),
  ('44444444-4444-4444-4444-444444444444', NULL, '업무', '태스크 관리', 'Briefcase', '#f59e0b', 3)
ON CONFLICT (id) DO NOTHING;

-- projects 테이블에 category_id 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES project_categories(id);

-- 기존 project_type을 category_id로 마이그레이션
UPDATE projects SET category_id = '11111111-1111-1111-1111-111111111111' WHERE project_type = 'code' AND category_id IS NULL;
UPDATE projects SET category_id = '22222222-2222-2222-2222-222222222222' WHERE project_type = 'document' AND category_id IS NULL;
UPDATE projects SET category_id = '33333333-3333-3333-3333-333333333333' WHERE project_type = 'design' AND category_id IS NULL;
UPDATE projects SET category_id = '44444444-4444-4444-4444-444444444444' WHERE project_type = 'work' AND category_id IS NULL;
