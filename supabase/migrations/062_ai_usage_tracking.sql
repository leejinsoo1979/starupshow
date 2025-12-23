-- AI Usage Tracking Schema
-- 프로젝트별 AI 토큰 사용량 및 ROI 추적

-- AI 사용량 기록 테이블
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES deployed_agents(id) ON DELETE SET NULL,

    -- 모델 정보
    model VARCHAR(100) NOT NULL, -- 'gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', etc.
    provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google'

    -- 토큰 사용량
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- 비용 (USD, 소수점 6자리까지)
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

    -- 작업 유형 및 결과
    action_type VARCHAR(100), -- 'code_review', 'code_generation', 'documentation', 'chat', 'analysis'
    action_result JSONB, -- { success: true, metrics: { bugs_found: 5, lines_generated: 100 } }

    -- 메타데이터
    request_id VARCHAR(255), -- API 요청 ID
    latency_ms INTEGER, -- 응답 시간
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 일별 사용량 집계 테이블 (성능 최적화)
CREATE TABLE IF NOT EXISTS ai_usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- 모델별 집계
    model VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,

    -- 일별 합계
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost_usd DECIMAL(12, 6) NOT NULL DEFAULT 0,

    -- 작업 유형별 통계
    action_breakdown JSONB, -- { code_review: { count: 10, tokens: 5000 }, ... }

    -- 성과 지표
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, date, model, provider)
);

-- 에이전트별 ROI 통계 테이블
CREATE TABLE IF NOT EXISTS ai_agent_roi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES deployed_agents(id) ON DELETE CASCADE,

    -- 기간
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- 비용
    total_cost_usd DECIMAL(12, 6) NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_requests INTEGER NOT NULL DEFAULT 0,

    -- 성과 지표 (에이전트 유형별로 다름)
    outcomes JSONB NOT NULL DEFAULT '{}',
    -- 예: {
    --   "bugs_found": 15,
    --   "code_lines_generated": 500,
    --   "documents_created": 10,
    --   "test_coverage_increase": 12.5,
    --   "time_saved_hours": 8.5
    -- }

    -- ROI 계산
    estimated_value_usd DECIMAL(12, 6), -- 추정 가치 (시간 절약 등)
    roi_percentage DECIMAL(10, 2), -- (value - cost) / cost * 100
    efficiency_score INTEGER, -- 0-100 점수

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, agent_id, period_start, period_end)
);

-- 예산 설정 테이블
CREATE TABLE IF NOT EXISTS ai_budget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,

    -- 월별 예산
    monthly_budget_usd DECIMAL(10, 2),

    -- 알림 설정
    alert_threshold_percent INTEGER DEFAULT 80, -- 80% 도달 시 알림
    daily_limit_usd DECIMAL(10, 2), -- 일일 한도

    -- 자동 최적화 설정
    auto_optimize BOOLEAN DEFAULT false,
    fallback_model VARCHAR(100), -- 예산 초과 시 대체 모델

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_project ON ai_usage_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model, provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_action ON ai_usage_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_project_date ON ai_usage_daily(project_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_agent_roi_project ON ai_agent_roi(project_id);

-- RLS 정책
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_roi ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_settings ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버만 조회 가능
CREATE POLICY "Project members can view ai usage logs" ON ai_usage_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = ai_usage_logs.project_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can view ai usage daily" ON ai_usage_daily
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = ai_usage_daily.project_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can view ai agent roi" ON ai_agent_roi
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = ai_agent_roi.project_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can manage budget settings" ON ai_budget_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = ai_budget_settings.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- 일별 집계 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_ai_usage_daily()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_usage_daily (
        project_id, date, model, provider,
        total_requests, total_input_tokens, total_output_tokens, total_cost_usd,
        success_count, error_count
    )
    VALUES (
        NEW.project_id,
        DATE(NEW.created_at),
        NEW.model,
        NEW.provider,
        1,
        NEW.input_tokens,
        NEW.output_tokens,
        NEW.cost_usd,
        CASE WHEN (NEW.action_result->>'success')::boolean THEN 1 ELSE 0 END,
        CASE WHEN (NEW.action_result->>'success')::boolean THEN 0 ELSE 1 END
    )
    ON CONFLICT (project_id, date, model, provider)
    DO UPDATE SET
        total_requests = ai_usage_daily.total_requests + 1,
        total_input_tokens = ai_usage_daily.total_input_tokens + NEW.input_tokens,
        total_output_tokens = ai_usage_daily.total_output_tokens + NEW.output_tokens,
        total_cost_usd = ai_usage_daily.total_cost_usd + NEW.cost_usd,
        success_count = ai_usage_daily.success_count +
            CASE WHEN (NEW.action_result->>'success')::boolean THEN 1 ELSE 0 END,
        error_count = ai_usage_daily.error_count +
            CASE WHEN (NEW.action_result->>'success')::boolean THEN 0 ELSE 1 END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거
DROP TRIGGER IF EXISTS trigger_update_ai_usage_daily ON ai_usage_logs;
CREATE TRIGGER trigger_update_ai_usage_daily
    AFTER INSERT ON ai_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_usage_daily();
