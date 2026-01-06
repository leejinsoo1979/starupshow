-- =====================================================
-- plan_questions 테이블 생성 (인터뷰 모드용)
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =====================================================

-- 1. plan_questions 테이블 생성
CREATE TABLE IF NOT EXISTS plan_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
    section_id TEXT,

    -- 질문 내용
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'number', 'date', 'select', 'multiselect', 'file')),
    options JSONB,  -- select/multiselect용 옵션

    -- 컨텍스트
    context TEXT,  -- 왜 이 질문이 필요한지
    placeholder_id TEXT,  -- 섹션 내 플레이스홀더 ID

    -- 응답
    answer TEXT,
    answered_at TIMESTAMPTZ,
    answered_by UUID,

    -- 상태
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    is_required BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'skipped', 'auto_filled')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_questions_plan ON plan_questions(plan_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON plan_questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_priority ON plan_questions(priority);

-- 3. RLS 활성화
ALTER TABLE plan_questions ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 (Service Role은 항상 접근 가능)
CREATE POLICY "service_role_all_plan_questions" ON plan_questions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. 일반 사용자 정책 (회사 멤버만 접근)
CREATE POLICY "company_members_plan_questions" ON plan_questions
    FOR ALL USING (plan_id IN (
        SELECT id FROM business_plans WHERE company_id IN (
            SELECT company_id FROM employees WHERE user_id = auth.uid()
        )
    ));

-- 6. updated_at 트리거
CREATE OR REPLACE FUNCTION update_plan_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_plan_questions_updated_at ON plan_questions;
CREATE TRIGGER update_plan_questions_updated_at
    BEFORE UPDATE ON plan_questions
    FOR EACH ROW EXECUTE FUNCTION update_plan_questions_updated_at();

-- 완료 확인
SELECT 'plan_questions 테이블이 성공적으로 생성되었습니다!' as result;
