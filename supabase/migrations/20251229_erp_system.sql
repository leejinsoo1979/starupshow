-- ============================================
-- GlowUS ERP System Database Schema
-- 서비스 수준 ERP 전체 테이블 설계
-- ============================================

-- ============================================
-- 1. 회사/조직 관리 (Company & Organization)
-- ============================================

-- 1.1 회사 정보
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    business_number VARCHAR(20), -- 사업자등록번호
    corporate_number VARCHAR(20), -- 법인등록번호
    ceo_name VARCHAR(100),

    -- 연락처
    phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(200),
    website VARCHAR(500),

    -- 주소
    postal_code VARCHAR(10),
    address VARCHAR(500),
    address_detail VARCHAR(200),

    -- 사업 정보
    business_type VARCHAR(100), -- 업태
    business_category VARCHAR(100), -- 업종
    establishment_date DATE,
    fiscal_year_start INTEGER DEFAULT 1, -- 회계연도 시작월 (1-12)

    -- 설정
    logo_url VARCHAR(500),
    settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 사업장/지점
CREATE TABLE IF NOT EXISTS business_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(200) NOT NULL,
    code VARCHAR(20), -- 지점코드
    location_type VARCHAR(50) DEFAULT 'branch', -- headquarters, branch, factory, warehouse

    phone VARCHAR(20),
    fax VARCHAR(20),

    postal_code VARCHAR(10),
    address VARCHAR(500),
    address_detail VARCHAR(200),

    is_headquarters BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 부서
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,

    manager_id UUID, -- employees 테이블 참조 (나중에 FK 추가)

    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 직급/직책
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    position_type VARCHAR(50) DEFAULT 'rank', -- rank(직급), title(직책)

    level INTEGER DEFAULT 0, -- 직급 레벨 (높을수록 상위)

    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 인사관리 (HR Management)
-- ============================================

-- 2.1 직원 마스터
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 시스템 로그인 연동

    -- 기본 정보
    employee_number VARCHAR(20), -- 사번
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),

    -- 개인정보
    resident_number VARCHAR(20), -- 주민등록번호 (암호화 저장 필요)
    birth_date DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(200),

    -- 주소
    postal_code VARCHAR(10),
    address VARCHAR(500),
    address_detail VARCHAR(200),

    -- 비상연락처
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),

    -- 소속 정보
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    location_id UUID REFERENCES business_locations(id) ON DELETE SET NULL,

    -- 입사 정보
    hire_date DATE,
    hire_type VARCHAR(50) DEFAULT 'regular', -- regular(정규직), contract(계약직), part_time(파트타임), intern(인턴)

    -- 퇴사 정보
    resignation_date DATE,
    resignation_reason TEXT,

    -- 상태
    status VARCHAR(50) DEFAULT 'active', -- active, on_leave, resigned

    -- 프로필
    profile_image_url VARCHAR(500),

    -- 급여 정보 (기본)
    bank_name VARCHAR(50),
    bank_account VARCHAR(50),
    bank_holder VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 부서 manager_id FK 추가
ALTER TABLE departments
ADD CONSTRAINT fk_departments_manager
FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 2.2 근태관리
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

    work_date DATE NOT NULL,

    -- 출퇴근 시간
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,

    -- 실제 근무시간
    work_hours DECIMAL(5,2), -- 총 근무시간
    overtime_hours DECIMAL(5,2) DEFAULT 0, -- 연장근무
    night_hours DECIMAL(5,2) DEFAULT 0, -- 야간근무

    -- 상태
    status VARCHAR(50) DEFAULT 'normal', -- normal, late, early_leave, absent, holiday, vacation

    -- 위치 정보 (GPS 출퇴근)
    check_in_location JSONB, -- {lat, lng, address}
    check_out_location JSONB,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, work_date)
);

-- 2.3 휴가관리
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL, -- 연차, 반차, 병가, 경조사 등
    code VARCHAR(20),

    is_paid BOOLEAN DEFAULT TRUE, -- 유급/무급
    is_annual_leave BOOLEAN DEFAULT FALSE, -- 연차 차감 여부
    default_days DECIMAL(5,1) DEFAULT 0, -- 기본 부여 일수

    color VARCHAR(20) DEFAULT '#3B82F6',

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

    year INTEGER NOT NULL,

    -- 연차
    annual_leave_total DECIMAL(5,1) DEFAULT 0, -- 총 부여
    annual_leave_used DECIMAL(5,1) DEFAULT 0, -- 사용
    annual_leave_remaining DECIMAL(5,1) DEFAULT 0, -- 잔여

    -- 기타 휴가 (JSON으로 유연하게)
    other_leaves JSONB DEFAULT '{}', -- {"병가": {"total": 3, "used": 0}, ...}

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE SET NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(5,1) NOT NULL, -- 사용일수 (반차는 0.5)

    reason TEXT,

    -- 결재
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 계약관리
CREATE TABLE IF NOT EXISTS employment_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

    contract_type VARCHAR(50) NOT NULL, -- regular, contract, part_time

    start_date DATE NOT NULL,
    end_date DATE, -- 정규직은 NULL

    -- 근무 조건
    work_hours_per_week DECIMAL(4,1) DEFAULT 40,
    work_days_per_week INTEGER DEFAULT 5,

    -- 급여 조건
    base_salary DECIMAL(15,2), -- 기본급
    salary_type VARCHAR(50) DEFAULT 'monthly', -- monthly, hourly, daily

    -- 계약서 파일
    contract_file_url VARCHAR(500),

    notes TEXT,

    is_current BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 교육이력
CREATE TABLE IF NOT EXISTS training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

    training_name VARCHAR(200) NOT NULL,
    training_type VARCHAR(50), -- internal, external, online
    provider VARCHAR(200), -- 교육기관

    start_date DATE,
    end_date DATE,
    hours DECIMAL(5,1), -- 교육시간

    result VARCHAR(50), -- completed, in_progress, failed
    certificate_url VARCHAR(500),

    cost DECIMAL(15,2) DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 급여관리 (Payroll Management)
-- ============================================

-- 3.1 급여 설정
CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    -- 급여일
    pay_day INTEGER DEFAULT 25, -- 매월 급여일

    -- 4대보험 요율 (회사 부담분)
    national_pension_rate DECIMAL(5,3) DEFAULT 4.5, -- 국민연금
    health_insurance_rate DECIMAL(5,3) DEFAULT 3.545, -- 건강보험
    long_term_care_rate DECIMAL(5,3) DEFAULT 12.81, -- 장기요양보험 (건강보험의 %)
    employment_insurance_rate DECIMAL(5,3) DEFAULT 0.9, -- 고용보험
    industrial_accident_rate DECIMAL(5,3) DEFAULT 0.7, -- 산재보험

    -- 소득세율 (간이세액표 사용)
    income_tax_rate DECIMAL(5,3) DEFAULT 0, -- 기본세율 (간이세액표 사용시 0)
    local_income_tax_rate DECIMAL(5,3) DEFAULT 10, -- 지방소득세 (소득세의 %)

    -- 기타 설정
    overtime_rate DECIMAL(3,2) DEFAULT 1.5, -- 연장근로 할증
    night_rate DECIMAL(3,2) DEFAULT 0.5, -- 야간근로 가산
    holiday_rate DECIMAL(3,2) DEFAULT 1.5, -- 휴일근로 할증

    settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id)
);

-- 3.2 급여 항목
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),

    item_type VARCHAR(50) NOT NULL, -- earning(지급), deduction(공제)
    category VARCHAR(50), -- base(기본급), allowance(수당), bonus(상여), tax(세금), insurance(보험), other

    is_taxable BOOLEAN DEFAULT TRUE, -- 과세 여부
    is_fixed BOOLEAN DEFAULT TRUE, -- 고정 여부 (매월 동일)

    calculation_type VARCHAR(50) DEFAULT 'fixed', -- fixed(고정), rate(비율), formula(수식)
    calculation_value DECIMAL(15,4), -- 고정값 또는 비율
    calculation_formula TEXT, -- 수식 (복잡한 계산용)

    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 직원별 급여 항목
CREATE TABLE IF NOT EXISTS employee_payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    payroll_item_id UUID REFERENCES payroll_items(id) ON DELETE CASCADE,

    amount DECIMAL(15,2), -- 해당 직원의 금액

    effective_date DATE NOT NULL,
    end_date DATE,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 급여 대장 (월별)
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    year INTEGER NOT NULL,
    month INTEGER NOT NULL,

    status VARCHAR(50) DEFAULT 'draft', -- draft, confirmed, paid

    total_employees INTEGER DEFAULT 0,
    total_earnings DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    total_net_pay DECIMAL(15,2) DEFAULT 0,

    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES employees(id),
    paid_at TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, year, month)
);

-- 3.5 급여 명세 (직원별 월별)
CREATE TABLE IF NOT EXISTS payroll_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    payroll_record_id UUID REFERENCES payroll_records(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

    year INTEGER NOT NULL,
    month INTEGER NOT NULL,

    -- 근무 정보
    work_days INTEGER DEFAULT 0,
    work_hours DECIMAL(6,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    night_hours DECIMAL(6,2) DEFAULT 0,
    holiday_hours DECIMAL(6,2) DEFAULT 0,

    -- 지급 항목 (JSONB로 유연하게)
    earnings JSONB DEFAULT '[]', -- [{item_id, name, amount}, ...]
    total_earnings DECIMAL(15,2) DEFAULT 0,

    -- 공제 항목
    deductions JSONB DEFAULT '[]',
    total_deductions DECIMAL(15,2) DEFAULT 0,

    -- 4대보험 상세
    national_pension DECIMAL(10,2) DEFAULT 0,
    health_insurance DECIMAL(10,2) DEFAULT 0,
    long_term_care DECIMAL(10,2) DEFAULT 0,
    employment_insurance DECIMAL(10,2) DEFAULT 0,

    -- 세금
    income_tax DECIMAL(10,2) DEFAULT 0,
    local_income_tax DECIMAL(10,2) DEFAULT 0,

    -- 실수령액
    net_pay DECIMAL(15,2) DEFAULT 0,

    -- 지급 정보
    bank_name VARCHAR(50),
    bank_account VARCHAR(50),
    bank_holder VARCHAR(100),

    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, year, month)
);

-- ============================================
-- 4. 매출입관리 (Sales & Purchase Management)
-- ============================================

-- 4.1 거래처
CREATE TABLE IF NOT EXISTS business_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    partner_type VARCHAR(50) DEFAULT 'both', -- customer(매출), vendor(매입), both
    business_number VARCHAR(20),
    ceo_name VARCHAR(100),

    -- 연락처
    phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(200),

    -- 주소
    postal_code VARCHAR(10),
    address VARCHAR(500),
    address_detail VARCHAR(200),

    -- 담당자
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(200),

    -- 거래 조건
    payment_terms INTEGER DEFAULT 30, -- 결제 조건 (일)
    credit_limit DECIMAL(15,2), -- 여신한도

    -- 계좌 정보
    bank_name VARCHAR(50),
    bank_account VARCHAR(50),
    bank_holder VARCHAR(100),

    notes TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 품목/서비스
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),

    product_type VARCHAR(50) DEFAULT 'product', -- product(상품), service(서비스)
    category VARCHAR(100),

    unit VARCHAR(20) DEFAULT 'EA', -- EA, BOX, SET, KG 등

    -- 가격
    selling_price DECIMAL(15,2) DEFAULT 0,
    purchase_price DECIMAL(15,2) DEFAULT 0,

    -- 세금
    tax_type VARCHAR(50) DEFAULT 'taxable', -- taxable(과세), exempt(면세), zero(영세)
    tax_rate DECIMAL(5,2) DEFAULT 10, -- 부가세율

    description TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 거래 (매출/매입)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    transaction_number VARCHAR(50), -- 거래번호
    transaction_type VARCHAR(50) NOT NULL, -- sales(매출), purchase(매입)

    partner_id UUID REFERENCES business_partners(id) ON DELETE SET NULL,
    partner_name VARCHAR(200), -- 스냅샷

    transaction_date DATE NOT NULL,
    due_date DATE, -- 결제 예정일

    -- 금액
    supply_amount DECIMAL(15,2) DEFAULT 0, -- 공급가액
    tax_amount DECIMAL(15,2) DEFAULT 0, -- 세액
    total_amount DECIMAL(15,2) DEFAULT 0, -- 합계

    -- 상태
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid
    paid_amount DECIMAL(15,2) DEFAULT 0,

    -- 세금계산서
    tax_invoice_number VARCHAR(50),
    tax_invoice_date DATE,
    tax_invoice_status VARCHAR(50), -- none, issued, received

    description TEXT,
    notes TEXT,

    created_by UUID REFERENCES employees(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.4 거래 상세
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,

    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200), -- 스냅샷

    quantity DECIMAL(15,3) DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'EA',
    unit_price DECIMAL(15,2) DEFAULT 0,

    supply_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,

    description TEXT,

    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5 결제 내역
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,

    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,

    payment_method VARCHAR(50), -- cash, bank_transfer, card, check

    bank_name VARCHAR(50),
    account_number VARCHAR(50),

    notes TEXT,

    created_by UUID REFERENCES employees(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 경비관리 (Expense Management)
-- ============================================

-- 5.1 경비 카테고리
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),

    parent_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

    budget_amount DECIMAL(15,2), -- 예산

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 법인카드
CREATE TABLE IF NOT EXISTS corporate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    card_name VARCHAR(100) NOT NULL,
    card_number VARCHAR(20), -- 마스킹 처리
    card_company VARCHAR(50),

    holder_id UUID REFERENCES employees(id) ON DELETE SET NULL,

    credit_limit DECIMAL(15,2),
    billing_day INTEGER, -- 결제일

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.3 경비 신청
CREATE TABLE IF NOT EXISTS expense_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

    request_number VARCHAR(50), -- 신청번호

    expense_date DATE NOT NULL,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

    amount DECIMAL(15,2) NOT NULL,

    payment_method VARCHAR(50), -- cash, corporate_card, personal_card
    corporate_card_id UUID REFERENCES corporate_cards(id) ON DELETE SET NULL,

    merchant_name VARCHAR(200), -- 가맹점명
    description TEXT,

    -- 영수증
    receipt_url VARCHAR(500),
    receipt_type VARCHAR(50), -- tax_invoice, card_receipt, cash_receipt

    -- 결재
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, rejected, reimbursed
    approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- 지급
    reimbursed_at TIMESTAMPTZ,
    reimbursement_amount DECIMAL(15,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.4 경비 결재선
CREATE TABLE IF NOT EXISTS expense_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_request_id UUID REFERENCES expense_requests(id) ON DELETE CASCADE,

    approver_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    approval_order INTEGER DEFAULT 1,

    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approved_at TIMESTAMPTZ,
    comment TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 공통 (Common)
-- ============================================

-- 6.1 첨부파일
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    entity_type VARCHAR(50) NOT NULL, -- employee, transaction, expense, etc.
    entity_id UUID NOT NULL,

    file_name VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),

    uploaded_by UUID REFERENCES employees(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 감사 로그
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    user_id UUID REFERENCES auth.users(id),
    employee_id UUID REFERENCES employees(id),

    action VARCHAR(50) NOT NULL, -- create, update, delete, view
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,

    old_values JSONB,
    new_values JSONB,

    ip_address VARCHAR(50),
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. 인덱스 생성
-- ============================================

-- 회사/조직
CREATE INDEX idx_business_locations_company ON business_locations(company_id);
CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_positions_company ON positions(company_id);

-- 인사
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, work_date);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- 급여
CREATE INDEX idx_payroll_records_company_date ON payroll_records(company_id, year, month);
CREATE INDEX idx_payroll_details_employee ON payroll_details(employee_id);
CREATE INDEX idx_payroll_details_record ON payroll_details(payroll_record_id);

-- 매출입
CREATE INDEX idx_business_partners_company ON business_partners(company_id);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_partner ON transactions(partner_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_status ON transactions(status);

-- 경비
CREATE INDEX idx_expense_requests_company ON expense_requests(company_id);
CREATE INDEX idx_expense_requests_employee ON expense_requests(employee_id);
CREATE INDEX idx_expense_requests_status ON expense_requests(status);

-- 공통
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- 8. RLS 정책 (Row Level Security)
-- ============================================

-- RLS 활성화
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 회사 테이블 RLS 정책
CREATE POLICY "Users can view own company" ON companies
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own company" ON companies
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own company" ON companies
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 나머지 테이블들은 company_id 기반 정책 (사용자의 회사 데이터만 접근)
-- 실제 환경에서는 employees 테이블과 연동하여 더 세밀한 권한 제어 필요

-- ============================================
-- 9. 기본 데이터 삽입 함수
-- ============================================

-- 회사 생성 시 기본 데이터 자동 생성 함수
CREATE OR REPLACE FUNCTION setup_company_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- 기본 직급 생성
    INSERT INTO positions (company_id, name, code, position_type, level, sort_order) VALUES
        (NEW.id, '대표이사', 'CEO', 'title', 100, 1),
        (NEW.id, '이사', 'DIR', 'title', 90, 2),
        (NEW.id, '부장', 'MGR', 'rank', 80, 3),
        (NEW.id, '차장', 'AMGR', 'rank', 70, 4),
        (NEW.id, '과장', 'SM', 'rank', 60, 5),
        (NEW.id, '대리', 'AM', 'rank', 50, 6),
        (NEW.id, '주임', 'JR', 'rank', 40, 7),
        (NEW.id, '사원', 'ST', 'rank', 30, 8);

    -- 기본 휴가 유형 생성
    INSERT INTO leave_types (company_id, name, code, is_paid, is_annual_leave, default_days) VALUES
        (NEW.id, '연차', 'ANNUAL', TRUE, TRUE, 15),
        (NEW.id, '반차(오전)', 'HALF_AM', TRUE, TRUE, 0.5),
        (NEW.id, '반차(오후)', 'HALF_PM', TRUE, TRUE, 0.5),
        (NEW.id, '병가', 'SICK', TRUE, FALSE, 3),
        (NEW.id, '경조휴가', 'FAMILY', TRUE, FALSE, 0),
        (NEW.id, '출산휴가', 'MATERNITY', TRUE, FALSE, 90),
        (NEW.id, '육아휴직', 'PARENTAL', FALSE, FALSE, 0),
        (NEW.id, '무급휴가', 'UNPAID', FALSE, FALSE, 0);

    -- 기본 급여 항목 생성
    INSERT INTO payroll_items (company_id, name, code, item_type, category, is_taxable, is_fixed, sort_order) VALUES
        (NEW.id, '기본급', 'BASE', 'earning', 'base', TRUE, TRUE, 1),
        (NEW.id, '식대', 'MEAL', 'earning', 'allowance', FALSE, TRUE, 2),
        (NEW.id, '교통비', 'TRANS', 'earning', 'allowance', FALSE, TRUE, 3),
        (NEW.id, '직책수당', 'POSITION', 'earning', 'allowance', TRUE, TRUE, 4),
        (NEW.id, '연장근로수당', 'OVERTIME', 'earning', 'allowance', TRUE, FALSE, 5),
        (NEW.id, '상여금', 'BONUS', 'earning', 'bonus', TRUE, FALSE, 6),
        (NEW.id, '국민연금', 'NP', 'deduction', 'insurance', FALSE, FALSE, 10),
        (NEW.id, '건강보험', 'HI', 'deduction', 'insurance', FALSE, FALSE, 11),
        (NEW.id, '장기요양보험', 'LTC', 'deduction', 'insurance', FALSE, FALSE, 12),
        (NEW.id, '고용보험', 'EI', 'deduction', 'insurance', FALSE, FALSE, 13),
        (NEW.id, '소득세', 'IT', 'deduction', 'tax', FALSE, FALSE, 14),
        (NEW.id, '지방소득세', 'LIT', 'deduction', 'tax', FALSE, FALSE, 15);

    -- 기본 경비 카테고리 생성
    INSERT INTO expense_categories (company_id, name, code) VALUES
        (NEW.id, '교통비', 'TRANS'),
        (NEW.id, '식비', 'MEAL'),
        (NEW.id, '접대비', 'ENT'),
        (NEW.id, '사무용품', 'OFFICE'),
        (NEW.id, '통신비', 'COMM'),
        (NEW.id, '회의비', 'MEETING'),
        (NEW.id, '출장비', 'TRAVEL'),
        (NEW.id, '기타', 'OTHER');

    -- 급여 설정 생성
    INSERT INTO payroll_settings (company_id) VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_setup_company_defaults ON companies;
CREATE TRIGGER trigger_setup_company_defaults
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION setup_company_defaults();

-- ============================================
-- 완료
-- ============================================
