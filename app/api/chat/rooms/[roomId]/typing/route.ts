export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDevUserIfEnabled } from '@/lib/dev-user'

// GET: 타이핑 상태 조회 (경량 API - 타이핑 중인 참여자만 반환)
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // DEV 바이패스 체크
    const devUser = getDevUserIfEnabled()
    let user: any = null

    if (devUser) {
      user = devUser
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { roomId } = await params

    // 타이핑 중인 참여자만 조회 (경량 쿼리)
    const { data: typingParticipants, error } = await (adminClient as any)
      .from('chat_participants')
      .select('id, user_id, agent_id, participant_type, is_typing')
      .eq('room_id', roomId)
      .eq('is_typing', true)

    if (error) {
      console.error('Failed to fetch typing status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 에이전트 정보만 추가 조회 (타이핑 중인 에이전트가 있을 경우)
    const agentIds = (typingParticipants || [])
      .filter((p: any) => p.agent_id)
      .map((p: any) => p.agent_id)

    let agentsMap: Record<string, any> = {}
    if (agentIds.length > 0) {
      const { data: agents } = await (adminClient as any)
        .from('deployed_agents')
        .select('id, name')
        .in('id', agentIds)

      for (const a of agents || []) {
        agentsMap[a.id] = a
      }
    }

    // 타이핑 중인 참여자에 에이전트 정보 추가
    const result = (typingParticipants || []).map((p: any) => ({
      ...p,
      agent: p.agent_id ? agentsMap[p.agent_id] : null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Typing status fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 타이핑 상태 업데이트
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // DEV 바이패스 체크
    const devUser = getDevUserIfEnabled()
    let user: any = null

    if (devUser) {
      user = devUser
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { roomId } = await params
    const { is_typing } = await request.json()

    // 참여자 타이핑 상태 업데이트 (adminClient로 RLS 우회)
    const { error } = await (adminClient as any)
      .from('chat_participants')
      .update({ is_typing: !!is_typing })
      .eq('room_id', roomId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to update typing status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Typing status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
