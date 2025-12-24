-- Update agent avatars to use DiceBear lorelei style (except Amy who has a real photo)
-- This migration updates all agents that don't have a custom uploaded avatar

UPDATE deployed_agents
SET avatar_url = 'https://api.dicebear.com/7.x/lorelei/svg?seed=' || encode(name::bytea, 'escape')
WHERE
  -- Amy는 제외 (실제 사진 사용)
  LOWER(name) NOT LIKE '%에이미%'
  AND LOWER(name) NOT LIKE '%amy%'
  -- 커스텀 업로드 이미지가 아닌 경우만 (DiceBear bottts 스타일 사용 중인 경우)
  AND (
    avatar_url LIKE '%dicebear%bottts%'
    OR avatar_url IS NULL
    OR avatar_url = ''
  );
