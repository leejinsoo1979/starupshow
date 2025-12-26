-- 레이첼을 Gemini Live로 전환
-- 기존 xAI Grok 대신 Gemini Live API 사용

UPDATE deployed_agents
SET
  voice_settings = jsonb_build_object(
    'provider', 'gemini',
    'voice', 'Aoede',
    'model', 'gemini-2.0-flash-exp',
    'conversation_style', 'friendly',
    'language', 'ko'
  )
WHERE LOWER(name) LIKE '%레이첼%'
   OR LOWER(name) LIKE '%rachel%';

-- 변경 확인
SELECT id, name, voice_settings
FROM deployed_agents
WHERE LOWER(name) LIKE '%레이첼%'
   OR LOWER(name) LIKE '%rachel%';
