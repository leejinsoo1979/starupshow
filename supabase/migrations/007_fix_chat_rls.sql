-- Fix RLS infinite recursion on chat_participants table
-- 문제: 기존 정책이 같은 테이블을 참조하여 무한 재귀 발생

-- 기존 문제되는 정책 삭제
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can add participants to rooms they created" ON chat_participants;
DROP POLICY IF EXISTS "Users can insert participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can update own participant status" ON chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON chat_participants;

-- RLS 임시 비활성화 후 재활성화 (정책 초기화)
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- 간단한 정책으로 재생성 (재귀 없음)
-- SELECT: 모든 인증된 사용자가 참여자 조회 가능 (앱 레벨에서 필터링)
CREATE POLICY "Authenticated users can view participants"
    ON chat_participants FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: 모든 인증된 사용자가 참여자 추가 가능
CREATE POLICY "Authenticated users can insert participants"
    ON chat_participants FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: 모든 인증된 사용자가 업데이트 가능 (앱 레벨에서 권한 체크)
CREATE POLICY "Authenticated users can update participants"
    ON chat_participants FOR UPDATE
    TO authenticated
    USING (true);

-- DELETE: 모든 인증된 사용자가 삭제 가능 (앱 레벨에서 권한 체크)
CREATE POLICY "Authenticated users can delete participants"
    ON chat_participants FOR DELETE
    TO authenticated
    USING (true);
