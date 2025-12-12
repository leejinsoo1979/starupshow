import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: 그룹의 모든 에이전트를 채팅방에 초대
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createClient()
    const adminClient = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { roomId } = params
    const body = await request.json()
    const { group_id } = body

    if (!group_id) {
      return NextResponse.json({ error: '그룹 ID가 필요합니다' }, { status: 400 })
    }

    // 1. 그룹 정보와 멤버 조회
    const { data: group, error: groupError } = await (adminClient as any)
      .from('agent_groups')
      .select(`
        *,
        members:agent_group_members(
          *,
          agent:deployed_agents(id, name, avatar_url, status, interaction_mode, llm_provider, llm_model, system_prompt)
        )
      `)
      .eq('id', group_id)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: '그룹을 찾을 수 없습니다' }, { status: 404 })
    }

    // 2. 채팅방 존재 확인
    const { data: room, error: roomError } = await (adminClient as any)
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: '채팅방을 찾을 수 없습니다' }, { status: 404 })
    }

    // 3. 현재 참여자 목록 조회
    const { data: existingParticipants } = await (adminClient as any)
      .from('chat_participants')
      .select('agent_id')
      .eq('room_id', roomId)
      .not('agent_id', 'is', null)

    const existingAgentIds = new Set(
      (existingParticipants || []).map((p: any) => p.agent_id)
    )

    // 4. 그룹 멤버 중 아직 참여하지 않은 에이전트만 추가
    const newAgents = (group.members || [])
      .filter((m: any) => m.agent && !existingAgentIds.has(m.agent.id))
      .sort((a: any, b: any) => a.speak_order - b.speak_order)

    if (newAgents.length === 0) {
      return NextResponse.json({
        message: '모든 그룹 멤버가 이미 참여 중입니다',
        added_count: 0
      })
    }

    // 5. 새 참여자 추가
    const participantsToInsert = newAgents.map((m: any) => ({
      room_id: roomId,
      participant_type: 'agent',
      user_id: null,
      agent_id: m.agent.id,
    }))

    const { error: insertError } = await (adminClient as any)
      .from('chat_participants')
      .insert(participantsToInsert)

    if (insertError) {
      console.error('그룹 초대 오류:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 6. 시스템 메시지 추가
    const agentNames = newAgents.map((m: any) => m.agent.name).join(', ')
    await (adminClient as any).from('chat_messages').insert({
      room_id: roomId,
      sender_type: 'user',
      sender_user_id: user.id,
      message_type: 'system',
      content: `그룹 "${group.name}"의 에이전트가 초대되었습니다: ${agentNames}`,
    })

    // 7. 채팅방의 interaction_mode 업데이트 (그룹 모드 적용)
    await (adminClient as any)
      .from('chat_rooms')
      .update({
        interaction_mode: group.interaction_mode,
        agent_group_id: group_id,
      })
      .eq('id', roomId)

    // 8. 업데이트된 채팅방 정보 반환
    const { data: updatedRoom } = await (adminClient as any)
      .from('chat_rooms')
      .select(`
        *,
        participants:chat_participants(
          *,
          agent:deployed_agents(id, name, avatar_url, status)
        )
      `)
      .eq('id', roomId)
      .single()

    return NextResponse.json({
      message: `${newAgents.length}명의 에이전트가 초대되었습니다`,
      added_count: newAgents.length,
      room: updatedRoom,
      group: {
        id: group.id,
        name: group.name,
        interaction_mode: group.interaction_mode,
      }
    })
  } catch (error) {
    console.error('그룹 초대 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}
