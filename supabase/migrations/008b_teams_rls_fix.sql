-- =====================================================
-- Teams 테이블 RLS 정책 완전 재설정
-- =====================================================

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Founders can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view their team" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Founders can update teams" ON public.teams;
DROP POLICY IF EXISTS "Founders can delete teams" ON public.teams;
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;

-- 2. RLS 활성화 확인
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 3. 새로운 정책 생성

-- SELECT: 로그인한 사용자는 자신이 founder인 팀 조회 가능
CREATE POLICY "teams_select_policy" ON public.teams
    FOR SELECT
    TO authenticated
    USING (founder_id = auth.uid());

-- INSERT: 로그인한 사용자는 자신을 founder로 하는 팀 생성 가능
-- WITH CHECK는 INSERT되는 새 row를 검증
CREATE POLICY "teams_insert_policy" ON public.teams
    FOR INSERT
    TO authenticated
    WITH CHECK (founder_id = auth.uid());

-- UPDATE: founder만 자신의 팀 수정 가능
-- USING: 기존 row 접근 권한
-- WITH CHECK: 수정 후 row 검증 (founder_id 변경 방지)
CREATE POLICY "teams_update_policy" ON public.teams
    FOR UPDATE
    TO authenticated
    USING (founder_id = auth.uid())
    WITH CHECK (founder_id = auth.uid());

-- DELETE: founder만 자신의 팀 삭제 가능
CREATE POLICY "teams_delete_policy" ON public.teams
    FOR DELETE
    TO authenticated
    USING (founder_id = auth.uid());

-- =====================================================
-- team_members 테이블 RLS 정책 (teams와 연관)
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team founders can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view other members" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;

-- RLS 활성화 확인
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: 팀 멤버는 같은 팀의 다른 멤버 조회 가능
CREATE POLICY "team_members_select_policy" ON public.team_members
    FOR SELECT
    TO authenticated
    USING (
        -- 본인 레코드이거나
        user_id = auth.uid()
        OR
        -- 같은 팀의 멤버인 경우 (team_id 기준)
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
        ))
        OR
        -- 같은 startup의 멤버인 경우 (startup_id 기준)
        (startup_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.startup_id = team_members.startup_id
            AND tm.user_id = auth.uid()
        ))
    );

-- INSERT: 팀 founder만 멤버 추가 가능
CREATE POLICY "team_members_insert_policy" ON public.team_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- team_id가 있는 경우: 해당 팀의 founder여야 함
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_id
            AND t.founder_id = auth.uid()
        ))
        OR
        -- startup_id가 있는 경우: 해당 startup의 founder여야 함
        (startup_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = startup_id
            AND s.founder_id = auth.uid()
        ))
    );

-- UPDATE: 팀 founder만 멤버 정보 수정 가능
CREATE POLICY "team_members_update_policy" ON public.team_members
    FOR UPDATE
    TO authenticated
    USING (
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_id
            AND t.founder_id = auth.uid()
        ))
        OR
        (startup_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = startup_id
            AND s.founder_id = auth.uid()
        ))
    );

-- DELETE: 팀 founder만 멤버 삭제 가능
CREATE POLICY "team_members_delete_policy" ON public.team_members
    FOR DELETE
    TO authenticated
    USING (
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_id
            AND t.founder_id = auth.uid()
        ))
        OR
        (startup_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.startups s
            WHERE s.id = startup_id
            AND s.founder_id = auth.uid()
        ))
    );

-- =====================================================
-- 확인용 쿼리 (실행 후 결과 확인)
-- =====================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('teams', 'team_members');
