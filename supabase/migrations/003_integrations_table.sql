-- Integrations 테이블 생성
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('github', 'slack', 'google_calendar')),
  name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  metadata JSONB DEFAULT '{}',
  connected BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(startup_id, type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_integrations_startup_id ON public.integrations(startup_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON public.integrations(type);

-- RLS 정책
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 파운더만 통합 관리 가능
CREATE POLICY "Founders can manage integrations" ON public.integrations
  FOR ALL
  USING (
    startup_id IN (
      SELECT id FROM public.startups WHERE founder_id = auth.uid()
    )
  )
  WITH CHECK (
    startup_id IN (
      SELECT id FROM public.startups WHERE founder_id = auth.uid()
    )
  );

-- updated_at 트리거
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
