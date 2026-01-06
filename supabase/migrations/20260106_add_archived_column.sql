-- Add archived column to government_programs table
-- This column is used for soft deletion and filtering in dashboard queries

ALTER TABLE government_programs ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_government_programs_archived ON government_programs(archived);

-- Comment on column
COMMENT ON COLUMN government_programs.archived IS 'Soft delete flag - true if program should be hidden from listings';
