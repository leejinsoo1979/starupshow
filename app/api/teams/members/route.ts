import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/teams/members - 내 팀의 팀원 목록
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 내가 속한 팀 조회
    const { data: myTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('founder_id', user.id)

    const { data: memberTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)

    const teamIds = [
      ...(myTeams?.map((t: any) => t.id) || []),
      ...(memberTeams?.map((m: any) => m.team_id) || []),
    ]

    if (teamIds.length === 0) {
      return NextResponse.json([])
    }

    // 해당 팀들의 모든 멤버 조회
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .in('team_id', teamIds)

    // 팀 founder들도 포함
    const { data: founders } = await supabase
      .from('teams')
      .select('founder_id')
      .in('id', teamIds)

    const allUserIds = new Set<string>()
    for (const m of (teamMembers as any[]) || []) {
      if (m.user_id) allUserIds.add(m.user_id)
    }
    for (const f of (founders as any[]) || []) {
      if (f.founder_id) allUserIds.add(f.founder_id)
    }

    // 자기 자신 제외
    allUserIds.delete(user.id)

    if (allUserIds.size === 0) {
      return NextResponse.json([])
    }

    // 사용자 정보 조회
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', Array.from(allUserIds))

    if (error) {
      console.error('Failed to fetch team members:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(users || [])
  } catch (error) {
    console.error('Team members fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
