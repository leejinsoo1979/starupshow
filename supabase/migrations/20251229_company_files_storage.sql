-- Company Files Storage Bucket
-- 회사 로고, 사업자등록증 등을 저장하는 스토리지 버킷

-- 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-files',
  'company-files',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 스토리지 정책: 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload company files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-files');

-- 스토리지 정책: 누구나 읽기 가능 (public bucket)
CREATE POLICY "Anyone can view company files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-files');

-- 스토리지 정책: 인증된 사용자만 삭제 가능
CREATE POLICY "Authenticated users can delete company files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'company-files');

-- companies 테이블에 business_registration_url 컬럼 추가
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS business_registration_url TEXT;

COMMENT ON COLUMN companies.business_registration_url IS '사업자등록증 이미지 URL';
