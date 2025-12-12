-- Add team_id to deployed_agents table
-- This allows agents to be associated with teams

ALTER TABLE deployed_agents
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Create index for team_id
CREATE INDEX IF NOT EXISTS idx_deployed_agents_team ON deployed_agents(team_id);

-- Update RLS policy to allow team members to view agents
CREATE POLICY "Team members can view team agents"
    ON deployed_agents FOR SELECT
    USING (
        auth.uid() = owner_id
        OR (
            team_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM teams
                WHERE teams.id = team_id
                AND (teams.founder_id = auth.uid() OR EXISTS (
                    SELECT 1 FROM team_members
                    WHERE team_members.team_id = deployed_agents.team_id
                    AND team_members.user_id = auth.uid()
                ))
            )
        )
    );
