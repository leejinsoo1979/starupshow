export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDevUserIfEnabled } from '@/lib/dev-user'
import {
  generateMeetingSummary,
  MeetingDeliverables,
  MeetingMessage,
  MeetingParticipant
} from '@/lib/meeting/summary-generator'

// GET: 회의 상태 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createClient()
    const adminClient = createAdminClient()

    const devUser = getDevUserIfEnabled()
    let user: any = devUser

    if (!devUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { roomId } = params

    const { data: room, error } = await (adminClient as any)
      .from('chat_rooms')
      .select('is_meeting_active, meeting_topic, meeting_duration_minutes, meeting_started_at, meeting_end_time, meeting_facilitator_id')
      .eq('id', roomId)
      .single()

    if (error) {
      console.error(`[Meeting API] GET error:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Meeting API] GET room - facilitator_id: ${room?.meeting_facilitator_id}`)

    // 남은 시간 계산
    let remainingSeconds = null
    if (room.is_meeting_active && room.meeting_end_time) {
      const endTime = new Date(room.meeting_end_time).getTime()
      const now = Date.now()
      remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000))
    }

    return NextResponse.json({
      ...room,
      remaining_seconds: remainingSeconds,
    })
  } catch (error) {
    console.error('Meeting status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 회의 시작
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createClient()
    const adminClient = createAdminClient()

    const devUser = getDevUserIfEnabled()
    let user: any = devUser

    if (!devUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { roomId } = params
    const body = await request.json()
    const { topic, duration_minutes = 30, facilitator_id = null } = body

    console.log(`[Meeting API] Starting meeting - facilitator_id: ${facilitator_id}`)

    const now = new Date()
    const endTime = new Date(now.getTime() + duration_minutes * 60 * 1000)

    const { data, error } = await (adminClient as any)
      .from('chat_rooms')
      .update({
        is_meeting_active: true,
        meeting_topic: topic || '자유 토론',
        meeting_duration_minutes: duration_minutes,
        meeting_started_at: now.toISOString(),
        meeting_end_time: endTime.toISOString(),
        meeting_facilitator_id: facilitator_id,
      })
      .eq('id', roomId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Meeting] Started in room ${roomId} for ${duration_minutes} minutes`)

    return NextResponse.json({
      ...data,
      message: '회의가 시작되었습니다',
    })
  } catch (error) {
    console.error('Meeting start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 회의 종료 및 회의록 자동 생성
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createClient()
    const adminClient = createAdminClient()

    const devUser = getDevUserIfEnabled()
    let user: any = devUser

    if (!devUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { roomId } = params

    // 현재 회의 정보 조회 (회의록 생성용)
    const { data: roomBefore, error: roomError } = await (adminClient as any)
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    console.log(`[Meeting] DELETE - roomBefore:`, {
      roomId,
      is_meeting_active: roomBefore?.is_meeting_active,
      meeting_started_at: roomBefore?.meeting_started_at,
      error: roomError?.message,
    })

    // 회의록 생성 (회의가 활성화 상태였다면)
    let meetingRecord = null
    if (roomBefore?.is_meeting_active && roomBefore?.meeting_started_at) {
      console.log(`[Meeting] Creating meeting record...`)
      const meetingStartedAt = roomBefore.meeting_started_at
      const endedAt = new Date()

      // 회의 시간 동안의 모든 메시지 조회 (전체 내용 저장용)
      const { data: messages } = await (adminClient as any)
        .from('chat_messages')
        .select(`
          id,
          content,
          message_type,
          sender_type,
          sender_user_id,
          sender_agent_id,
          metadata,
          created_at
        `)
        .eq('room_id', roomId)
        .gte('created_at', meetingStartedAt)
        .order('created_at', { ascending: true })

      const messageCount = messages?.length || 0

      // 참여자 정보 조회 (상세 정보 포함)
      const { data: participants } = await (adminClient as any)
        .from('chat_participants')
        .select(`
          id,
          participant_type,
          user_id,
          agent_id,
          users:user_id (id, name, email),
          deployed_agents:agent_id (id, name, persona, job_title)
        `)
        .eq('room_id', roomId)

      const userParticipants = participants?.filter((p: any) => p.participant_type === 'user') || []
      const agentParticipants = participants?.filter((p: any) => p.participant_type === 'agent') || []

      const participantCount = userParticipants.length
      const agentCount = agentParticipants.length

      // 회의 시간 계산
      const startedAt = new Date(meetingStartedAt)
      const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / (1000 * 60))

      // 참여자 정보 정리
      const participantsData = [
        ...userParticipants.map((p: any) => ({
          type: 'user',
          id: p.user_id,
          name: p.users?.name || '사용자',
          email: p.users?.email,
        })),
        ...agentParticipants.map((p: any) => ({
          type: 'agent',
          id: p.agent_id,
          name: p.deployed_agents?.name || 'AI 에이전트',
          persona: p.deployed_agents?.persona,
          job_title: p.deployed_agents?.job_title,
        })),
      ]

      // 메시지 정보 정리 (발신자 이름 포함)
      const messagesData: MeetingMessage[] = (messages || []).map((m: any) => {
        const sender = m.sender_type === 'user'
          ? participantsData.find(p => p.type === 'user' && p.id === m.sender_user_id)
          : participantsData.find(p => p.type === 'agent' && p.id === m.sender_agent_id)

        return {
          id: m.id,
          content: m.content,
          sender_type: m.sender_type,
          sender_name: sender?.name || (m.sender_type === 'user' ? '사용자' : 'AI 에이전트'),
          sender_id: m.sender_type === 'user' ? m.sender_user_id : m.sender_agent_id,
          created_at: m.created_at,
        }
      })

      // 참여자 데이터를 MeetingParticipant 형식으로 변환
      const meetingParticipants: MeetingParticipant[] = participantsData.map((p: any) => ({
        type: p.type,
        id: p.id,
        name: p.name,
        persona: p.persona,
        job_title: p.job_title,
      }))

      // meeting_config에서 outputs 설정 추출 → Deliverables 변환
      const meetingConfig = roomBefore.meeting_config || {}
      const outputs = meetingConfig.outputs || {}

      const deliverables: MeetingDeliverables = {
        decisionSummary: outputs.summary !== false,  // 기본 활성화
        actionTasks: outputs.actionItems === true,
        agentOpinions: outputs.boardReflection === true,
        riskSummary: outputs.riskRegister === true,
        nextAgenda: outputs.nextAgenda === true,
        workflowSync: false,  // TODO: 워크플로우 연동은 추후 구현
      }

      console.log('[Meeting] Generating AI summary with deliverables:', deliverables)

      // AI 요약 생성
      const topic = roomBefore.meeting_topic || '자유 토론'
      const generatedSummary = await generateMeetingSummary(
        messagesData,
        meetingParticipants,
        topic,
        deliverables
      )

      console.log('[Meeting] Generated summary:', {
        hasSummary: !!generatedSummary.summary,
        decisionsCount: generatedSummary.decisions?.length || 0,
        actionItemsCount: generatedSummary.actionItems?.length || 0,
        agentOpinionsCount: generatedSummary.agentOpinions?.length || 0,
        risksCount: generatedSummary.risks?.length || 0,
        nextAgendaCount: generatedSummary.nextAgenda?.length || 0,
      })

      // 회의록 생성 (meeting_config, 메시지, 참여자 정보, AI 요약 포함)
      const { data: record, error: recordError } = await (adminClient as any)
        .from('meeting_records')
        .insert({
          room_id: roomId,
          room_name: roomBefore.name,
          topic: topic,
          started_at: meetingStartedAt,
          ended_at: endedAt.toISOString(),
          duration_minutes: durationMinutes,
          participant_count: participantCount,
          agent_count: agentCount,
          message_count: messageCount,
          facilitator_id: roomBefore.meeting_facilitator_id,
          meeting_config: meetingConfig,
          messages: messagesData,
          participants: participantsData,
          created_by: user.id,
          // AI 생성 요약 데이터
          summary: generatedSummary.summary || null,
          key_points: generatedSummary.keyPoints || [],
          decisions: generatedSummary.decisions || [],
          action_items: generatedSummary.actionItems || [],
          risk_register: generatedSummary.risks || [],
          agent_opinions: generatedSummary.agentOpinions || [],
          next_agenda: generatedSummary.nextAgenda || [],
        })
        .select()
        .single()

      if (!recordError && record) {
        meetingRecord = record
        console.log(`[Meeting] Created meeting record: ${record.id} with ${messageCount} messages`)
      } else if (recordError) {
        console.error(`[Meeting] Failed to create meeting record:`, recordError)
      }
    } else {
      console.log(`[Meeting] Skipped meeting record creation - is_meeting_active: ${roomBefore?.is_meeting_active}, meeting_started_at: ${roomBefore?.meeting_started_at}`)
    }

    // 회의 상태 초기화
    const { data, error } = await (adminClient as any)
      .from('chat_rooms')
      .update({
        is_meeting_active: false,
        meeting_started_at: null,
        meeting_end_time: null,
      })
      .eq('id', roomId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 모든 에이전트 타이핑 상태 해제
    await (adminClient as any)
      .from('chat_participants')
      .update({ is_typing: false })
      .eq('room_id', roomId)

    console.log(`[Meeting] Ended in room ${roomId}`)

    return NextResponse.json({
      ...data,
      message: '회의가 종료되었습니다',
      meeting_record: meetingRecord,
    })
  } catch (error) {
    console.error('Meeting end error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
