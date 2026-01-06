-- 대표자 정보 컬럼 추가
ALTER TABLE company_support_profiles
ADD COLUMN IF NOT EXISTS ceo_name TEXT,
ADD COLUMN IF NOT EXISTS ceo_birth_date DATE;

COMMENT ON COLUMN company_support_profiles.ceo_name IS '대표자명';
COMMENT ON COLUMN company_support_profiles.ceo_birth_date IS '대표자 생년월일 (청년창업 판단용)';
