-- 레이첼 에이전트에 OpenAI GPT-4o 모델 설정
-- Rachel uses ChatGPT for more natural conversation

-- 레이첼 에이전트의 LLM 설정 업데이트
UPDATE deployed_agents
SET
  llm_provider = 'openai',
  model = 'gpt-4o-mini',
  voice_settings = jsonb_build_object(
    'voice', 'tara',
    'conversation_style', 'friendly',
    'vad_sensitivity', 'medium'
  )
WHERE LOWER(name) LIKE '%레이첼%'
   OR LOWER(name) LIKE '%rachel%';

-- 확인용 코멘트
COMMENT ON COLUMN deployed_agents.llm_provider IS 'LLM 제공자 (openai, grok, gemini, qwen, ollama) - 레이첼은 openai 사용';
