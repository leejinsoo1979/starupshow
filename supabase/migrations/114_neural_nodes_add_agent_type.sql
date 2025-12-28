-- Add 'agent', 'folder', 'file' to neural_nodes type constraint
-- Created: 2025-12-27

-- Drop old constraint
ALTER TABLE neural_nodes DROP CONSTRAINT IF EXISTS neural_nodes_type_check;

-- Add new constraint with additional types
ALTER TABLE neural_nodes ADD CONSTRAINT neural_nodes_type_check
  CHECK (type IN ('self', 'concept', 'project', 'doc', 'idea', 'decision', 'memory', 'task', 'person', 'insight', 'folder', 'file', 'agent'));
