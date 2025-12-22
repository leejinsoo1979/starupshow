-- Neural Plan History (Version Control for Blueprint)
CREATE TABLE IF NOT EXISTS neural_plan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID NOT NULL REFERENCES neural_maps(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    commit_message TEXT,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "added": [], "removed": [], "moved": [] }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for faster history lookup by map
CREATE INDEX IF NOT EXISTS idx_neural_plan_history_map ON neural_plan_history(map_id);
