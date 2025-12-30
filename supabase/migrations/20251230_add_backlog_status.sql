-- ============================================
-- Add BACKLOG status to project_tasks
-- ============================================

-- Remove existing constraint
ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_status_check;

-- Add new constraint with BACKLOG
ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_status_check
  CHECK (status IN ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'));
