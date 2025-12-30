-- ============================================
-- Task Hub: Simplified Migration (VARCHAR types)
-- Run this in Supabase Dashboard SQL Editor
-- ============================================

-- 1. Main Table: unified_tasks
CREATE TABLE IF NOT EXISTS unified_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'TODO',
  priority VARCHAR(20) DEFAULT 'NONE',
  type VARCHAR(20) DEFAULT 'PERSONAL',

  -- Relations
  company_id UUID,
  project_id UUID,
  parent_task_id UUID REFERENCES unified_tasks(id) ON DELETE CASCADE,

  -- Assignee (User or Agent)
  assignee_id UUID,
  assignee_type VARCHAR(20) DEFAULT 'USER',

  -- Creator
  created_by UUID NOT NULL,
  created_by_type VARCHAR(20) DEFAULT 'USER',

  -- Time
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),

  -- Classification
  tags TEXT[] DEFAULT '{}',
  labels JSONB DEFAULT '[]',

  -- Ordering
  position INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Source
  source VARCHAR(50) DEFAULT 'MANUAL',
  source_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Task Activities Table
CREATE TABLE IF NOT EXISTS task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES unified_tasks(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  actor_id UUID,
  actor_type VARCHAR(20) DEFAULT 'USER',
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Task Checklists Table
CREATE TABLE IF NOT EXISTS task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES unified_tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. View for Task Hub
CREATE OR REPLACE VIEW task_hub_view AS
SELECT
  t.*,
  (SELECT name FROM projects WHERE id = t.project_id) as project_name,
  (SELECT name FROM companies WHERE id = t.company_id) as company_name
FROM unified_tasks t;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_unified_tasks_status ON unified_tasks(status);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_assignee ON unified_tasks(assignee_id, assignee_type);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_company ON unified_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_project ON unified_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_created_by ON unified_tasks(created_by, created_by_type);
CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON task_checklists(task_id);

-- 6. RLS Policies (disabled for dev)
ALTER TABLE unified_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (dev mode)
CREATE POLICY "Allow all for authenticated" ON unified_tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON task_activities FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON task_checklists FOR ALL USING (true);

-- 7. Auto-update trigger
CREATE OR REPLACE FUNCTION update_unified_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS unified_tasks_updated_at ON unified_tasks;
CREATE TRIGGER unified_tasks_updated_at
  BEFORE UPDATE ON unified_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_tasks_updated_at();
