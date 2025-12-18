-- Add job_title column to deployed_agents
ALTER TABLE public.deployed_agents ADD COLUMN IF NOT EXISTS job_title TEXT;

COMMENT ON COLUMN public.deployed_agents.job_title IS '에이전트 직무/직함 (예: 마케팅 매니저, 개발팀장)';
