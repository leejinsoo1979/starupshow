export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - 통합 목록 조회
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startup_id = searchParams.get('startup_id')

  if (!startup_id) {
    return NextResponse.json({ error: 'startup_id required' }, { status: 400 })
  }

  // 권한 확인
  const { data: ownership } = await (supabase
    .from('startups')
    .select('id')
    .eq('id', startup_id)
    .eq('founder_id', user.id)
    .single() as any)

  if (!ownership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { data, error } = await (supabase
    .from('integrations')
    .select('*')
    .eq('startup_id', startup_id) as any)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST - 통합 추가
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { startup_id, type, access_token, metadata } = body

  if (!startup_id || !type || !access_token) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 권한 확인
  const { data: ownership } = await (supabase
    .from('startups')
    .select('id')
    .eq('id', startup_id)
    .eq('founder_id', user.id)
    .single() as any)

  if (!ownership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // 기존 통합 확인
  const { data: existing } = await (supabase
    .from('integrations')
    .select('id')
    .eq('startup_id', startup_id)
    .eq('type', type)
    .single() as any)

  if (existing) {
    // 업데이트
    const { data, error } = await ((supabase.from('integrations') as any)
      .update({
        access_token,
        metadata,
        connected: true,
        connected_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // 새로 생성
  const { data, error } = await ((supabase.from('integrations') as any)
    .insert({
      startup_id,
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      access_token,
      metadata,
      connected: true,
      connected_at: new Date().toISOString()
    })
    .select()
    .single())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
