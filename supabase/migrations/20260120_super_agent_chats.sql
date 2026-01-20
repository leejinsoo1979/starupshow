-- Super Agent 채팅 기록 테이블
CREATE TABLE IF NOT EXISTS public.super_agent_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  preview TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_super_agent_chats_user ON public.super_agent_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_super_agent_chats_created ON public.super_agent_chats(created_at DESC);

-- RLS
ALTER TABLE public.super_agent_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats"
  ON public.super_agent_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON public.super_agent_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON public.super_agent_chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats"
  ON public.super_agent_chats FOR DELETE
  USING (auth.uid() = user_id);
