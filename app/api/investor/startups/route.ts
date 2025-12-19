export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 투자자용 스타트업 목록 조회
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 유저 프로필 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (profile?.role !== 'INVESTOR') {
      return NextResponse.json({ error: 'Investor access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')
    const stage = searchParams.get('stage')
    const search = searchParams.get('search')

    // 공개된 스타트업 또는 접근 승인된 스타트업 조회
    let query = supabase
      .from('startups')
      .select(`
        *,
        founder:users!startups_founder_id_fkey(id, name, email, avatar_url),
        investor_access!left(status)
      `)
      .or(`investor_access.vc_user_id.eq.${user.id},investor_access.is.null`)

    if (industry) {
      query = query.eq('industry', industry)
    }

    if (stage) {
      query = query.eq('stage', stage)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    interface StartupRow {
      id: string
      name: string
      description?: string
      industry: string
      stage: string
      logo_url?: string
      monthly_revenue?: number
      runway_months?: number
      employee_count?: number
      founder?: any
      investor_access?: Array<{ status: string }>
    }

    const { data: startups, error } = await query
      .order('created_at', { ascending: false })
      .limit(50) as { data: StartupRow[] | null; error: any }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 접근 상태 추가
    const startupsWithAccess = startups?.map(startup => ({
      ...startup,
      accessStatus: startup.investor_access?.[0]?.status || 'none',
      founder: startup.founder,
    }))

    return NextResponse.json(startupsWithAccess || [])
  } catch (error) {
    console.error('Investor startups error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
