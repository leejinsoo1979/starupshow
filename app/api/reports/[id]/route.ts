export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - 특정 리포트 상세 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: report, error } = await (supabase
    .from('reports')
    .select('*, startup:startups(name, founder_id)')
    .eq('id', params.id)
    .single() as any)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // 권한 확인 (파운더 또는 팀원)
  const isFounder = report.startup?.founder_id === user.id

  const { data: membership } = await (supabase
    .from('team_members')
    .select('id')
    .eq('startup_id', report.startup_id)
    .eq('user_id', user.id)
    .single() as any)

  if (!isFounder && !membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  return NextResponse.json(report)
}

// DELETE - 리포트 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 리포트 조회 및 권한 확인
  const { data: report } = await (supabase
    .from('reports')
    .select('*, startup:startups(founder_id)')
    .eq('id', params.id)
    .single() as any)

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // 파운더만 삭제 가능
  if (report.startup?.founder_id !== user.id) {
    return NextResponse.json({ error: 'Only founder can delete reports' }, { status: 403 })
  }

  const { error } = await (supabase
    .from('reports')
    .delete()
    .eq('id', params.id) as any)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
