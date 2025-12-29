-- ============================================
-- 그룹웨어 시스템 (Groupware System)
-- 조직도, 근태관리, 전자결재
-- ============================================

-- ============================================
-- 1. 조직도 확장 (Organization Chart)
-- ============================================

-- 부서 테이블에 계층 구조 필드 추가
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES departments(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 부서 인덱스
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_level ON departments(level);

-- ============================================
-- 2. 근태관리 (Attendance Management)
-- ============================================

-- 근무 일정 테이블 (Work Schedules)
CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- 근무 시간
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '18:00',
    break_start TIME DEFAULT '12:00',
    break_end TIME DEFAULT '13:00',

    -- 근무일 (비트마스크: 일=1, 월=2, 화=4, 수=8, 목=16, 금=32, 토=64)
    work_days INTEGER DEFAULT 62, -- 월~금

    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 출퇴근 기록 테이블 (Attendance Records)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

    -- 날짜
    work_date DATE NOT NULL,

    -- 출퇴근 시간
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,

    -- 실제 근무 시간 (분)
    work_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,

    -- 상태
    status VARCHAR(20) DEFAULT 'normal', -- normal, late, early_leave, absent, holiday, vacation

    -- 메모
    note TEXT,

    -- 위치 정보
    check_in_location JSONB,
    check_out_location JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, work_date)
);

-- 휴가 유형 테이블 (Leave Types)
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,

    -- 설정
    is_paid BOOLEAN DEFAULT true,
    default_days DECIMAL(5,1) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 휴가 잔여일수 테이블 (Leave Balances)
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,

    year INTEGER NOT NULL,
    total_days DECIMAL(5,1) DEFAULT 0,
    used_days DECIMAL(5,1) DEFAULT 0,
    remaining_days DECIMAL(5,1) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, leave_type_id, year)
);

-- 휴가 신청 테이블 (Leave Requests)
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id),

    -- 휴가 기간
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(5,1) NOT NULL,

    -- 반차 여부
    is_half_day BOOLEAN DEFAULT false,
    half_day_type VARCHAR(10), -- morning, afternoon

    -- 사유
    reason TEXT,

    -- 상태
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled

    -- 승인 정보
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 근태 인덱스
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ============================================
-- 3. 전자결재 (Electronic Approval)
-- ============================================

-- 결재 양식 테이블 (Approval Templates)
CREATE TABLE IF NOT EXISTS approval_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    category VARCHAR(50), -- leave, expense, purchase, general, hr
    description TEXT,

    -- 양식 필드 정의
    form_fields JSONB DEFAULT '[]',

    -- 기본 결재선
    default_approvers JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결재 문서 테이블 (Approval Documents)
CREATE TABLE IF NOT EXISTS approval_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    template_id UUID REFERENCES approval_templates(id),

    -- 문서 정보
    document_number VARCHAR(50),
    title VARCHAR(500) NOT NULL,
    content TEXT,

    -- 양식 데이터
    form_data JSONB DEFAULT '{}',

    -- 기안자
    drafter_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    draft_date TIMESTAMPTZ DEFAULT NOW(),

    -- 상태
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending, approved, rejected, cancelled

    -- 첨부파일
    attachments JSONB DEFAULT '[]',

    -- 긴급 여부
    is_urgent BOOLEAN DEFAULT false,

    -- 완료 정보
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결재선 테이블 (Approval Lines)
CREATE TABLE IF NOT EXISTS approval_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES approval_documents(id) ON DELETE CASCADE,

    -- 결재자
    approver_id UUID REFERENCES employees(id),

    -- 순서 및 타입
    step_order INTEGER NOT NULL,
    approval_type VARCHAR(20) DEFAULT 'approval', -- approval, agreement, reference

    -- 상태
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, skipped

    -- 결재 정보
    action_date TIMESTAMPTZ,
    comment TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결재 코멘트 테이블 (Approval Comments)
CREATE TABLE IF NOT EXISTS approval_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES approval_documents(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 전자결재 인덱스
CREATE INDEX IF NOT EXISTS idx_approval_docs_drafter ON approval_documents(drafter_id);
CREATE INDEX IF NOT EXISTS idx_approval_docs_status ON approval_documents(status);
CREATE INDEX IF NOT EXISTS idx_approval_lines_document ON approval_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_lines_approver ON approval_lines(approver_id);

-- ============================================
-- 4. 기본 데이터 삽입
-- ============================================

-- 기본 휴가 유형 (회사별로 생성 필요)
-- INSERT INTO leave_types (company_id, name, code, is_paid, default_days, sort_order) VALUES
-- ('company_id', '연차', 'ANNUAL', true, 15, 1),
-- ('company_id', '반차', 'HALF', true, 0, 2),
-- ('company_id', '병가', 'SICK', true, 0, 3),
-- ('company_id', '경조휴가', 'FAMILY', true, 0, 4),
-- ('company_id', '출산휴가', 'MATERNITY', true, 90, 5),
-- ('company_id', '육아휴직', 'PARENTAL', false, 0, 6),
-- ('company_id', '무급휴가', 'UNPAID', false, 0, 7);

-- 기본 결재 양식
-- INSERT INTO approval_templates (company_id, name, code, category, sort_order) VALUES
-- ('company_id', '휴가신청서', 'LEAVE', 'leave', 1),
-- ('company_id', '지출결의서', 'EXPENSE', 'expense', 2),
-- ('company_id', '구매요청서', 'PURCHASE', 'purchase', 3),
-- ('company_id', '업무보고서', 'REPORT', 'general', 4),
-- ('company_id', '품의서', 'PROPOSAL', 'general', 5);

-- ============================================
-- 컬럼 코멘트
-- ============================================

COMMENT ON TABLE work_schedules IS '근무 일정 (근무시간, 휴게시간 등)';
COMMENT ON TABLE attendance_records IS '출퇴근 기록';
COMMENT ON TABLE leave_types IS '휴가 유형';
COMMENT ON TABLE leave_balances IS '휴가 잔여일수';
COMMENT ON TABLE leave_requests IS '휴가 신청';
COMMENT ON TABLE approval_templates IS '결재 양식';
COMMENT ON TABLE approval_documents IS '결재 문서';
COMMENT ON TABLE approval_lines IS '결재선';
COMMENT ON TABLE approval_comments IS '결재 코멘트';
