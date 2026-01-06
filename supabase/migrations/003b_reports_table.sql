-- Reports 테이블 생성
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  title TEXT NOT NULL,
  summary TEXT,
  stats JSONB DEFAULT '{}',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_startup_id ON public.reports(startup_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_period ON public.reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- RLS 정책
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 파운더와 팀원은 리포트 조회 가능
CREATE POLICY "Founders and team members can view reports" ON public.reports
  FOR SELECT
  USING (
    startup_id IN (
      SELECT id FROM public.startups WHERE founder_id = auth.uid()
    )
    OR startup_id IN (
      SELECT startup_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- 파운더만 리포트 생성 가능
CREATE POLICY "Founders can create reports" ON public.reports
  FOR INSERT
  WITH CHECK (
    startup_id IN (
      SELECT id FROM public.startups WHERE founder_id = auth.uid()
    )
  );

-- 파운더만 리포트 삭제 가능
CREATE POLICY "Founders can delete reports" ON public.reports
  FOR DELETE
  USING (
    startup_id IN (
      SELECT id FROM public.startups WHERE founder_id = auth.uid()
    )
  );

-- updated_at 트리거
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
