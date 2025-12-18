-- =====================================================
-- Fix teams RLS policy to allow team members to view
-- =====================================================

-- 기존 teams SELECT 정책 삭제
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;

-- 새로운 SELECT 정책: founder 또는 team_members에 속한 사용자 모두 조회 가능
CREATE POLICY "teams_select_policy" ON public.teams
    FOR SELECT
    TO authenticated
    USING (
        -- 본인이 founder이거나
        founder_id = auth.uid()
        OR
        -- team_members 테이블에 해당 팀의 멤버로 등록된 경우
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = teams.id
            AND tm.user_id = auth.uid()
        )
    );

-- 확인용 (실행 후 삭제)
-- SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'teams';
