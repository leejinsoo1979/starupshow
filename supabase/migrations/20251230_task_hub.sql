-- ============================================
-- Task Hub: Unified Task Management System
-- ============================================

-- Task 상태 enum
DO $$ BEGIN
    CREATE TYPE task_hub_status AS ENUM (
        'BACKLOG',
        'TODO',
        'IN_PROGRESS',
        'IN_REVIEW',
        'DONE',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Task 우선순위 enum
DO $$ BEGIN
    CREATE TYPE task_hub_priority AS ENUM (
        'NONE',
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Task 유형 enum
DO $$ BEGIN
    CREATE TYPE task_hub_type AS ENUM (
        'PERSONAL',
        'TEAM',
        'AGENT',
        'PROJECT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 생성자 유형 enum
DO $$ BEGIN
    CREATE TYPE task_creator_type AS ENUM (
        'USER',
        'AGENT',
        'SYSTEM',
        'WORKFLOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 메인 테이블: unified_tasks
-- ============================================
CREATE TABLE IF NOT EXISTS unified_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 기본 정보
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status task_hub_status DEFAULT 'TODO',
    priority task_hub_priority DEFAULT 'NONE',
    type task_hub_type DEFAULT 'PERSONAL',

    -- 연결 관계
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES unified_tasks(id) ON DELETE CASCADE,

    -- 담당자 (User 또는 Agent)
    assignee_id UUID,  -- user_id 또는 agent_id
    assignee_type task_creator_type DEFAULT 'USER',

    -- 생성자
    created_by UUID NOT NULL,
    created_by_type task_creator_type DEFAULT 'USER',

    -- 시간 관련
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),

    -- 분류
    tags TEXT[] DEFAULT '{}',
    labels JSONB DEFAULT '[]',  -- [{id, name, color}]

    -- 순서 (Kanban 드래그앤드롭용)
    position INTEGER DEFAULT 0,

    -- 메타데이터
    metadata JSONB DEFAULT '{}',

    -- 출처 (대화에서 생성된 경우)
    source VARCHAR(50) DEFAULT 'MANUAL',  -- MANUAL, CONVERSATION, WORKFLOW, API
    source_id UUID,  -- conversation_id, workflow_execution_id 등

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_unified_tasks_company ON unified_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_project ON unified_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_assignee ON unified_tasks(assignee_id, assignee_type);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_status ON unified_tasks(status);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_priority ON unified_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_type ON unified_tasks(type);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_due_date ON unified_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_created_by ON unified_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_parent ON unified_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_position ON unified_tasks(status, position);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_tags ON unified_tasks USING GIN(tags);

-- ============================================
-- 라벨 테이블 (재사용 가능한 라벨)
-- ============================================
CREATE TABLE IF NOT EXISTS task_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6B7280',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_task_labels_company ON task_labels(company_id);

-- ============================================
-- Task 활동 로그
-- ============================================
CREATE TABLE IF NOT EXISTS task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES unified_tasks(id) ON DELETE CASCADE,

    -- 활동 정보
    action VARCHAR(50) NOT NULL,  -- CREATED, UPDATED, STATUS_CHANGED, ASSIGNED, COMMENTED
    actor_id UUID NOT NULL,
    actor_type task_creator_type DEFAULT 'USER',

    -- 변경 내용
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,

    -- 코멘트 (COMMENTED action의 경우)
    comment TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_actor ON task_activities(actor_id);

-- ============================================
-- Task 체크리스트 (하위 항목)
-- ============================================
CREATE TABLE IF NOT EXISTS task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES unified_tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON task_checklists(task_id);

-- ============================================
-- RLS 정책
-- ============================================
ALTER TABLE unified_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

-- unified_tasks RLS
CREATE POLICY "Users can view tasks in their company" ON unified_tasks
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can create tasks" ON unified_tasks
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can update tasks in their company" ON unified_tasks
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can delete their own tasks" ON unified_tasks
    FOR DELETE USING (
        created_by = auth.uid()
        OR company_id IN (
            SELECT company_id FROM employees
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- task_labels RLS
CREATE POLICY "Users can view labels in their company" ON task_labels
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage labels in their company" ON task_labels
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
    );

-- task_activities RLS
CREATE POLICY "Users can view activities for accessible tasks" ON task_activities
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM unified_tasks WHERE
                company_id IN (
                    SELECT company_id FROM employees WHERE user_id = auth.uid()
                )
                OR created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create activities" ON task_activities
    FOR INSERT WITH CHECK (actor_id = auth.uid());

-- task_checklists RLS
CREATE POLICY "Users can manage checklists for accessible tasks" ON task_checklists
    FOR ALL USING (
        task_id IN (
            SELECT id FROM unified_tasks WHERE
                company_id IN (
                    SELECT company_id FROM employees WHERE user_id = auth.uid()
                )
                OR created_by = auth.uid()
        )
    );

-- ============================================
-- 트리거: updated_at 자동 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_unified_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_unified_tasks_updated_at ON unified_tasks;
CREATE TRIGGER trigger_update_unified_tasks_updated_at
    BEFORE UPDATE ON unified_tasks
    FOR EACH ROW EXECUTE FUNCTION update_unified_tasks_updated_at();

-- ============================================
-- 트리거: 상태 변경 시 completed_at 자동 설정
-- ============================================
CREATE OR REPLACE FUNCTION handle_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- DONE으로 변경 시 completed_at 설정
    IF NEW.status = 'DONE' AND OLD.status != 'DONE' THEN
        NEW.completed_at = NOW();
    END IF;

    -- DONE에서 다른 상태로 변경 시 completed_at 제거
    IF OLD.status = 'DONE' AND NEW.status != 'DONE' THEN
        NEW.completed_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_task_status_change ON unified_tasks;
CREATE TRIGGER trigger_handle_task_status_change
    BEFORE UPDATE ON unified_tasks
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_task_status_change();

-- ============================================
-- 뷰: Task with details
-- ============================================
CREATE OR REPLACE VIEW task_hub_view AS
SELECT
    t.*,
    -- 담당자 정보 (User인 경우)
    CASE
        WHEN t.assignee_type = 'USER' THEN u.email
        ELSE NULL
    END as assignee_email,
    CASE
        WHEN t.assignee_type = 'USER' THEN e.name
        ELSE NULL
    END as assignee_name,
    -- 담당자 정보 (Agent인 경우)
    CASE
        WHEN t.assignee_type = 'AGENT' THEN a.name
        ELSE NULL
    END as agent_name,
    -- 프로젝트 정보
    p.name as project_name,
    -- 하위 Task 개수
    (SELECT COUNT(*) FROM unified_tasks st WHERE st.parent_task_id = t.id) as subtask_count,
    -- 완료된 하위 Task 개수
    (SELECT COUNT(*) FROM unified_tasks st WHERE st.parent_task_id = t.id AND st.status = 'DONE') as completed_subtask_count,
    -- 체크리스트 개수
    (SELECT COUNT(*) FROM task_checklists c WHERE c.task_id = t.id) as checklist_count,
    -- 완료된 체크리스트 개수
    (SELECT COUNT(*) FROM task_checklists c WHERE c.task_id = t.id AND c.is_completed = TRUE) as completed_checklist_count
FROM unified_tasks t
LEFT JOIN auth.users u ON t.assignee_type = 'USER' AND t.assignee_id = u.id
LEFT JOIN employees e ON t.assignee_type = 'USER' AND e.user_id = t.assignee_id AND e.company_id = t.company_id
LEFT JOIN deployed_agents a ON t.assignee_type = 'AGENT' AND t.assignee_id = a.id
LEFT JOIN projects p ON t.project_id = p.id;

-- ============================================
-- 초기 라벨 데이터 (회사별로 복사 가능)
-- ============================================
-- 기본 라벨은 회사 생성 시 자동 생성하도록 별도 함수로 처리

COMMENT ON TABLE unified_tasks IS 'Task Hub: 통합 Task 관리 테이블';
COMMENT ON TABLE task_labels IS 'Task Hub: 재사용 가능한 라벨';
COMMENT ON TABLE task_activities IS 'Task Hub: Task 활동 로그';
COMMENT ON TABLE task_checklists IS 'Task Hub: Task 체크리스트 항목';
