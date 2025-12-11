-- 004: commits 테이블에 브랜치 및 GitHub 연동 필드 추가
-- GitHub 커밋 연동 및 브랜치별 업무 기록 지원

-- 브랜치 필드 추가
ALTER TABLE public.commits
ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'main';

-- GitHub SHA (커밋 해시)
ALTER TABLE public.commits
ADD COLUMN IF NOT EXISTS github_sha TEXT UNIQUE;

-- GitHub 커밋 URL
ALTER TABLE public.commits
ADD COLUMN IF NOT EXISTS github_url TEXT;

-- 변경 파일 목록 (JSON 배열)
-- 예: [{"path": "src/index.ts", "action": "modified"}]
ALTER TABLE public.commits
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- 추가 메타데이터 (저장소 정보, 작성자 정보 등)
ALTER TABLE public.commits
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 브랜치별 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_commits_branch ON public.commits(branch);
CREATE INDEX IF NOT EXISTS idx_commits_github_sha ON public.commits(github_sha);
CREATE INDEX IF NOT EXISTS idx_commits_startup_branch ON public.commits(startup_id, branch);

-- 브랜치별 커밋 수 집계 뷰
CREATE OR REPLACE VIEW public.branch_commit_summary AS
SELECT
  startup_id,
  branch,
  COUNT(*) as commit_count,
  MAX(created_at) as last_commit_at,
  array_agg(DISTINCT user_id) as contributors
FROM public.commits
WHERE startup_id IS NOT NULL
GROUP BY startup_id, branch
ORDER BY last_commit_at DESC;

-- RLS 정책 (기존 commits 정책에 의존)
-- 브랜치 필드는 commits 테이블의 기존 RLS 정책을 따름

COMMENT ON COLUMN public.commits.branch IS '커밋이 발생한 Git 브랜치 (예: main, develop, feature/login)';
COMMENT ON COLUMN public.commits.github_sha IS 'GitHub 커밋 해시 (40자리 SHA)';
COMMENT ON COLUMN public.commits.github_url IS 'GitHub 커밋 페이지 URL';
COMMENT ON COLUMN public.commits.files IS '변경된 파일 목록 (JSON 배열)';
COMMENT ON COLUMN public.commits.metadata IS '추가 메타데이터 (저장소, 작성자 정보 등)';
