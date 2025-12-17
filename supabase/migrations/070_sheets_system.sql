-- AI Sheets System
-- Spreadsheet-like data storage and analysis

-- ============================================
-- Sheets Table
-- ============================================
CREATE TABLE IF NOT EXISTS sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Sheet Info
  name TEXT NOT NULL,
  description TEXT,

  -- Column definitions
  columns JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"id": "col1", "name": "이름", "type": "text", "width": 150}, ...]
  -- Types: text, number, date, select, multiselect, checkbox, url, email, formula

  -- Row data
  rows JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"id": "row1", "col1": "value", "col2": 123, ...}, ...]

  -- Sheet settings
  settings JSONB DEFAULT '{}',
  -- Format: {"frozen_columns": 1, "frozen_rows": 1, "filters": [], "sorts": []}

  -- Creator
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Status
  is_template BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Sheet Views (saved filter/sort configurations)
-- ============================================
CREATE TABLE IF NOT EXISTS sheet_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- View configuration
  filters JSONB DEFAULT '[]',
  -- Format: [{"column_id": "col1", "operator": "contains", "value": "test"}, ...]

  sorts JSONB DEFAULT '[]',
  -- Format: [{"column_id": "col1", "direction": "asc"}, ...]

  hidden_columns TEXT[] DEFAULT '{}',
  column_order TEXT[] DEFAULT '{}',

  -- Creator
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Sheet Analysis Results (AI-generated insights)
-- ============================================
CREATE TABLE IF NOT EXISTS sheet_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,

  -- Analysis type
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'summary',      -- 데이터 요약
    'statistics',   -- 통계 분석
    'trends',       -- 트렌드 분석
    'anomalies',    -- 이상치 탐지
    'correlation',  -- 상관관계 분석
    'forecast',     -- 예측
    'custom'        -- 커스텀 분석
  )),

  -- Query used for analysis
  query TEXT,

  -- Analysis results
  results JSONB NOT NULL,
  -- Format varies by analysis_type

  -- AI model used
  model_used TEXT,
  tokens_used INTEGER,

  -- Creator
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_sheets_team_id ON sheets(team_id);
CREATE INDEX idx_sheets_project_id ON sheets(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_sheets_created_by ON sheets(created_by);
CREATE INDEX idx_sheets_is_archived ON sheets(is_archived) WHERE is_archived = false;
CREATE INDEX idx_sheet_views_sheet_id ON sheet_views(sheet_id);
CREATE INDEX idx_sheet_analyses_sheet_id ON sheet_analyses(sheet_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_analyses ENABLE ROW LEVEL SECURITY;

-- Sheets: Team members can access
CREATE POLICY "sheets_select" ON sheets
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = sheets.team_id AND t.founder_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = sheets.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "sheets_insert" ON sheets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = sheets.team_id AND (
        t.founder_id = auth.uid() OR
        EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "sheets_update" ON sheets
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = sheets.team_id AND t.founder_id = auth.uid()
    )
  );

CREATE POLICY "sheets_delete" ON sheets
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = sheets.team_id AND t.founder_id = auth.uid()
    )
  );

-- Sheet Views: Same as sheets
CREATE POLICY "sheet_views_select" ON sheet_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = sheet_views.sheet_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM teams t WHERE t.id = s.team_id AND t.founder_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = s.team_id AND tm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "sheet_views_insert" ON sheet_views
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = sheet_views.sheet_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM teams t WHERE t.id = s.team_id AND t.founder_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = s.team_id AND tm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "sheet_views_update" ON sheet_views
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "sheet_views_delete" ON sheet_views
  FOR DELETE USING (created_by = auth.uid());

-- Sheet Analyses: Same as sheets
CREATE POLICY "sheet_analyses_select" ON sheet_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = sheet_analyses.sheet_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM teams t WHERE t.id = s.team_id AND t.founder_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = s.team_id AND tm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "sheet_analyses_insert" ON sheet_analyses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = sheet_analyses.sheet_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM teams t WHERE t.id = s.team_id AND t.founder_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = s.team_id AND tm.user_id = auth.uid())
      )
    )
  );

-- ============================================
-- Trigger for updated_at
-- ============================================
CREATE TRIGGER update_sheets_updated_at
  BEFORE UPDATE ON sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sheet_views_updated_at
  BEFORE UPDATE ON sheet_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE sheets;
