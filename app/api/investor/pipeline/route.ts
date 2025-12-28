export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 파이프라인 목록 조회
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pipeline, error } = await supabase
      .from('vc_pipelines')
      .select(`
        *,
        startup:startups(
          id,
          name,
          industry,
          stage,
          logo_url,
          monthly_revenue,
          runway_months,
          employee_count,
          founder:users!startups_founder_id_fkey(name, email)
        )
      `)
      .eq('vc_user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      // 테이블이 없을 수 있음
      if (error.code === '42P01') {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(pipeline || [])
  } catch (error) {
    console.error('Get pipeline error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 파이프라인에 스타트업 추가
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startupId, stage = 'INTERESTED', notes } = body

    if (!startupId) {
      return NextResponse.json({ error: 'Startup ID required' }, { status: 400 })
    }

    // 기존 항목 확인
    const { data: existing } = await supabase
      .from('vc_pipelines')
      .select('id')
      .eq('startup_id', startupId)
      .eq('vc_user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already in pipeline' }, { status: 400 })
    }

    const { data, error } = await (supabase.from('vc_pipelines') as any)
      .insert({
        startup_id: startupId,
        vc_user_id: user.id,
        stage,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Add to pipeline error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 파이프라인 스테이지 업데이트
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pipelineId, stage, notes } = body

    if (!pipelineId) {
      return NextResponse.json({ error: 'Pipeline ID required' }, { status: 400 })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (stage) updates.stage = stage
    if (notes !== undefined) updates.notes = notes

    const { data, error } = await (supabase.from('vc_pipelines') as any)
      .update(updates)
      .eq('id', pipelineId)
      .eq('vc_user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Update pipeline error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
