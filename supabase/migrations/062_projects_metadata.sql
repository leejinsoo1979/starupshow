-- Add metadata column to projects table
-- This stores additional project metadata from package.json, pyproject.toml, etc.

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.projects.metadata IS 'JSON metadata for the project (scripts, dependencies, version, etc.)';

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON public.projects USING gin(metadata);
