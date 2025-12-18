-- Add prompt_sections JSONB column to deployed_agents
-- Stores 8-section prompt configuration per agent
-- {
--   work_operating_model: string,
--   human_communication: string,
--   professional_habits: string,
--   no_hallucination: string,
--   collaboration_conflict: string,
--   deliverable_templates: string,
--   context_anchor: string,
--   response_format: string,
--   messenger_rules: string
-- }

ALTER TABLE deployed_agents
ADD COLUMN IF NOT EXISTS prompt_sections JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN deployed_agents.prompt_sections IS '8-section prompt configuration for human-like agent behavior';
