-- Add commits table for work logging (커밋 기반 업무 기록 시스템)

-- Create impact level type
DO $$ BEGIN
    CREATE TYPE impact_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Commits table
CREATE TABLE IF NOT EXISTS public.commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,  -- team_id references startup
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,

    description TEXT NOT NULL,
    impact_level impact_level NOT NULL DEFAULT 'medium',
    next_action TEXT,
    files JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commits_user ON public.commits(user_id);
CREATE INDEX IF NOT EXISTS idx_commits_team ON public.commits(team_id);
CREATE INDEX IF NOT EXISTS idx_commits_task ON public.commits(task_id);
CREATE INDEX IF NOT EXISTS idx_commits_created ON public.commits(created_at DESC);

-- Enable RLS
ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view commits in their teams"
    ON public.commits FOR SELECT
    USING (
        -- User is the author
        auth.uid() = user_id
        OR
        -- User is the startup founder
        EXISTS (
            SELECT 1 FROM public.startups
            WHERE id = commits.team_id AND founder_id = auth.uid()
        )
        OR
        -- User is a team member
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE startup_id = commits.team_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create commits in their teams"
    ON public.commits FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            -- User is the startup founder
            EXISTS (
                SELECT 1 FROM public.startups
                WHERE id = team_id AND founder_id = auth.uid()
            )
            OR
            -- User is a team member
            EXISTS (
                SELECT 1 FROM public.team_members
                WHERE startup_id = team_id AND user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own commits"
    ON public.commits FOR DELETE
    USING (auth.uid() = user_id);
