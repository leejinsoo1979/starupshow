-- =====================================================
-- Proactive Engine Tables
-- 능동적 에이전트 시스템을 위한 테이블
-- =====================================================

-- 1. proactive_suggestions (능동적 제안)
CREATE TABLE IF NOT EXISTS proactive_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Suggestion Type
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'task_reminder',
    'proactive_offer',
    'relationship_nudge',
    'skill_suggestion',
    'self_improvement',
    'error_alert',
    'insight_share'
  )),

  -- Content
  title TEXT NOT NULL,
  title_kr TEXT NOT NULL,
  message TEXT NOT NULL,
  message_kr TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,

  -- Source
  source_pattern_id UUID,
  source_memory_ids UUID[] DEFAULT '{}',
  source_learning_ids UUID[] DEFAULT '{}',

  -- Priority & Timing
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'delivered',
    'accepted',
    'dismissed',
    'expired',
    'executed'
  )),

  -- Actions
  suggested_action JSONB,  -- { type: 'create_task', params: {...}, label: '...', labelKr: '...' }
  action_result JSONB,

  -- Metadata
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);

-- 2. proactive_patterns (학습된 패턴)
CREATE TABLE IF NOT EXISTS proactive_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- Pattern Definition
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'recurring_task',
    'time_preference',
    'user_behavior',
    'error_pattern',
    'relationship_milestone',
    'skill_gap'
  )),

  pattern_name TEXT NOT NULL,
  pattern_name_kr TEXT NOT NULL,
  pattern_description TEXT,
  pattern_description_kr TEXT,

  -- Pattern Detection Rules (JSONB for flexibility)
  detection_rules JSONB NOT NULL,
  /* Example:
  {
    "trigger": "time_based",
    "schedule": "0 9 * * 1",
    "conditions": [
      { "field": "last_task_type", "operator": "eq", "value": "weekly_report" }
    ],
    "cooldownMinutes": 60
  }
  */

  -- Pattern Stats
  occurrence_count INTEGER DEFAULT 1,
  last_occurrence_at TIMESTAMPTZ,
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. agent_healing_records (자가치유 기록)
CREATE TABLE IF NOT EXISTS agent_healing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  -- Issue
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'workflow_failure',
    'api_connection_error',
    'knowledge_base_corruption',
    'state_stuck',
    'performance_degradation',
    'memory_overflow'
  )),

  issue_description TEXT NOT NULL,
  issue_description_kr TEXT NOT NULL,
  issue_severity TEXT DEFAULT 'medium' CHECK (issue_severity IN ('low', 'medium', 'high', 'critical')),

  -- Diagnosis
  diagnosis JSONB,
  /* Example:
  {
    "rootCause": "API rate limit exceeded",
    "rootCauseKr": "API 호출 제한 초과",
    "affectedComponents": ["web_search", "youtube_transcript"],
    "suggestedActions": [
      { "type": "wait_and_retry", "params": {...}, "description": "...", "riskLevel": "safe" }
    ],
    "confidence": 85,
    "analyzedAt": "2026-01-30T12:00:00Z"
  }
  */

  -- Healing Action
  healing_action JSONB,  -- Selected action from diagnosis.suggestedActions
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Result
  status TEXT DEFAULT 'detected' CHECK (status IN (
    'detected',
    'diagnosing',
    'awaiting_approval',
    'healing',
    'healed',
    'failed',
    'escalated'
  )),

  healing_result JSONB,  -- { success: boolean, message: string, durationMs: number, retryCount: number }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 4. agent_heartbeat_log (하트비트 로그)
CREATE TABLE IF NOT EXISTS agent_heartbeat_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES deployed_agents(id) ON DELETE CASCADE,

  heartbeat_type TEXT NOT NULL CHECK (heartbeat_type IN (
    'scheduled',
    'event_triggered',
    'realtime'
  )),

  -- Evaluation Results
  patterns_detected INTEGER DEFAULT 0,
  suggestions_generated INTEGER DEFAULT 0,
  issues_detected INTEGER DEFAULT 0,

  -- Stats Snapshot
  stats_snapshot JSONB,  -- { trustScore, successRate, totalInteractions, level }

  -- Performance
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

-- proactive_suggestions
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_agent ON proactive_suggestions(agent_id);
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_user ON proactive_suggestions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_status ON proactive_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_scheduled ON proactive_suggestions(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_pending ON proactive_suggestions(agent_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_type ON proactive_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_proactive_suggestions_created ON proactive_suggestions(created_at DESC);

-- proactive_patterns
CREATE INDEX IF NOT EXISTS idx_proactive_patterns_agent ON proactive_patterns(agent_id);
CREATE INDEX IF NOT EXISTS idx_proactive_patterns_type ON proactive_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_proactive_patterns_active ON proactive_patterns(agent_id, is_active) WHERE is_active = true;

-- agent_healing_records
CREATE INDEX IF NOT EXISTS idx_agent_healing_records_agent ON agent_healing_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_healing_records_status ON agent_healing_records(status);
CREATE INDEX IF NOT EXISTS idx_agent_healing_records_pending ON agent_healing_records(agent_id, status)
  WHERE status IN ('detected', 'awaiting_approval');
CREATE INDEX IF NOT EXISTS idx_agent_healing_records_severity ON agent_healing_records(issue_severity);
CREATE INDEX IF NOT EXISTS idx_agent_healing_records_created ON agent_healing_records(created_at DESC);

-- agent_heartbeat_log
CREATE INDEX IF NOT EXISTS idx_agent_heartbeat_log_agent ON agent_heartbeat_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeat_log_created ON agent_heartbeat_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeat_log_type ON agent_heartbeat_log(heartbeat_type);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE proactive_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_healing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_heartbeat_log ENABLE ROW LEVEL SECURITY;

-- proactive_suggestions: Agent owner or target user can manage
CREATE POLICY "Agent owner can manage suggestions"
  ON proactive_suggestions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = proactive_suggestions.agent_id
      AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- proactive_patterns: Agent owner only
CREATE POLICY "Agent owner can manage patterns"
  ON proactive_patterns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = proactive_patterns.agent_id
      AND owner_id = auth.uid()
    )
  );

-- agent_healing_records: Agent owner only
CREATE POLICY "Agent owner can manage healing records"
  ON agent_healing_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_healing_records.agent_id
      AND owner_id = auth.uid()
    )
  );

-- agent_heartbeat_log: Agent owner can view
CREATE POLICY "Agent owner can view heartbeat log"
  ON agent_heartbeat_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deployed_agents
      WHERE id = agent_heartbeat_log.agent_id
      AND owner_id = auth.uid()
    )
  );

-- Service role can insert heartbeat logs
CREATE POLICY "Service role can insert heartbeat log"
  ON agent_heartbeat_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Functions
-- =====================================================

-- Function to update pattern's updated_at on modification
CREATE OR REPLACE FUNCTION update_proactive_pattern_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proactive_pattern_timestamp
  BEFORE UPDATE ON proactive_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_proactive_pattern_timestamp();

-- Function to auto-expire old suggestions
CREATE OR REPLACE FUNCTION expire_old_suggestions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE proactive_suggestions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE proactive_suggestions IS '에이전트의 능동적 제안 저장';
COMMENT ON TABLE proactive_patterns IS '에이전트가 학습한 패턴 저장';
COMMENT ON TABLE agent_healing_records IS '에이전트 자가치유 기록';
COMMENT ON TABLE agent_heartbeat_log IS '에이전트 하트비트 로그';

COMMENT ON COLUMN proactive_suggestions.suggestion_type IS '제안 유형: task_reminder, proactive_offer, relationship_nudge, skill_suggestion, self_improvement, error_alert, insight_share';
COMMENT ON COLUMN proactive_suggestions.confidence_score IS '제안 신뢰도 (0-100)';
COMMENT ON COLUMN proactive_patterns.detection_rules IS '패턴 감지 규칙 (trigger, conditions, cooldown 등)';
COMMENT ON COLUMN agent_healing_records.diagnosis IS '문제 진단 결과 (rootCause, affectedComponents, suggestedActions)';
COMMENT ON COLUMN agent_heartbeat_log.stats_snapshot IS '하트비트 시점의 에이전트 스탯 스냅샷';
