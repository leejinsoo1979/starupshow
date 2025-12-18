-- 에이전트 공용 프롬프트 설정 테이블
CREATE TABLE IF NOT EXISTS public.agent_prompt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,

  -- 8-섹션 프롬프트
  work_operating_model TEXT NOT NULL DEFAULT '',
  human_communication TEXT NOT NULL DEFAULT '',
  professional_habits TEXT NOT NULL DEFAULT '',
  no_hallucination TEXT NOT NULL DEFAULT '',
  collaboration_conflict TEXT NOT NULL DEFAULT '',
  deliverable_templates TEXT NOT NULL DEFAULT '',
  context_anchor TEXT NOT NULL DEFAULT '',
  response_format TEXT NOT NULL DEFAULT '',

  -- 메신저 전용 규칙
  messenger_rules TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id)
);

-- RLS 설정
ALTER TABLE public.agent_prompt_settings ENABLE ROW LEVEL SECURITY;

-- 팀 멤버만 조회/수정 가능
CREATE POLICY "Team members can view prompt settings"
  ON public.agent_prompt_settings
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update prompt settings"
  ON public.agent_prompt_settings
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert prompt settings"
  ON public.agent_prompt_settings
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_prompt_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompt_settings_timestamp
  BEFORE UPDATE ON public.agent_prompt_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_settings_timestamp();
