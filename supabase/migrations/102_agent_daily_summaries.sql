-- Agent Daily Summaries Table
-- 에이전트의 일일 활동 요약 저장

-- ============================================
-- Table Creation
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.deployed_agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    summary TEXT NOT NULL,
    highlights TEXT[] DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 하루에 에이전트당 하나의 요약만 허용
    UNIQUE(agent_id, date)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_daily_summaries_agent_id
ON public.agent_daily_summaries(agent_id);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date
ON public.agent_daily_summaries(date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_agent_date
ON public.agent_daily_summaries(agent_id, date DESC);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.agent_daily_summaries ENABLE ROW LEVEL SECURITY;

-- 에이전트 소유자는 요약 조회 가능
CREATE POLICY "Users can view summaries of their agents"
ON public.agent_daily_summaries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.deployed_agents
        WHERE deployed_agents.id = agent_daily_summaries.agent_id
        AND deployed_agents.user_id = auth.uid()
    )
);

-- 서비스 역할만 삽입/업데이트 가능 (스케줄러용)
CREATE POLICY "Service role can manage summaries"
ON public.agent_daily_summaries FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- Add is_archived column to agent_memories if not exists
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agent_memories'
        AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE public.agent_memories
        ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

        CREATE INDEX idx_memories_archived
        ON public.agent_memories(is_archived)
        WHERE is_archived = FALSE;
    END IF;
END $$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE public.agent_daily_summaries IS '에이전트 일일 활동 요약';
COMMENT ON COLUMN public.agent_daily_summaries.date IS '요약 대상 날짜';
COMMENT ON COLUMN public.agent_daily_summaries.summary IS '하루 활동 요약 텍스트';
COMMENT ON COLUMN public.agent_daily_summaries.highlights IS '주요 활동/성과 목록';
COMMENT ON COLUMN public.agent_daily_summaries.stats IS '통계 데이터 (메모리 개수, 타입별 분포 등)';
