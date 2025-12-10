import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 스타트업 접근 요청
export async function POST(request: Request) {
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

    const body = await request.json()
    const { startupId, message } = body

    if (!startupId) {
      return NextResponse.json({ error: 'Startup ID required' }, { status: 400 })
    }

    // 기존 요청 확인
    interface ExistingRequest {
      id: string
      status: string
    }
    const { data: existingRequest } = await supabase
      .from('investor_access')
      .select('id, status')
      .eq('startup_id', startupId)
      .eq('vc_user_id', user.id)
      .single() as { data: ExistingRequest | null }

    if (existingRequest) {
      return NextResponse.json({
        error: 'Request already exists',
        status: existingRequest.status
      }, { status: 400 })
    }

    // 접근 요청 생성
    const { data, error } = await (supabase.from('investor_access') as any)
      .insert({
        startup_id: startupId,
        vc_user_id: user.id,
        status: 'PENDING',
        message: message || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Access request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 접근 요청 목록 조회 (투자자용)
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requests, error } = await supabase
      .from('investor_access')
      .select(`
        *,
        startup:startups(id, name, industry, stage, logo_url)
      `)
      .eq('vc_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(requests || [])
  } catch (error) {
    console.error('Get access requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
