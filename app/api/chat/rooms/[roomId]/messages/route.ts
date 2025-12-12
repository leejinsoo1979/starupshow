import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SendMessageRequest } from '@/types/chat'
import { generateAgentChatResponse, generateAgentMeetingResponse } from '@/lib/langchain/agent-chat'
import {
  processAgentResponsesWithMemory,
  convertToDbMessage,
  getRoomAgents,
  extractKnowledgeFromConversation,
} from '@/lib/agents/chat-integration'
import { getMemoryService } from '@/lib/agents/memory'
import { getDevUserIfEnabled } from '@/lib/dev-user'

// GET: 메시지 목록 조회 (페이지네이션)
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createClient()
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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // cursor for pagination

    // 참여자인지 확인
    const { data: participant } = await (adminClient as any)
      .from('chat_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 메시지 조회
    let query = (adminClient as any)
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Failed to fetch messages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // sender 정보 수집 및 조회
    const userIds = new Set<string>()
    const agentIds = new Set<string>()

    for (const msg of (messages as any[]) || []) {
      if (msg.sender_user_id) userIds.add(msg.sender_user_id)
      if (msg.sender_agent_id) agentIds.add(msg.sender_agent_id)
    }

    let usersMap: Record<string, any> = {}
    let agentsMap: Record<string, any> = {}

    if (userIds.size > 0) {
      const { data: users } = await (adminClient as any)
        .from('users')
        .select('id, name, avatar_url')
        .in('id', Array.from(userIds))

      for (const u of users || []) {
        usersMap[u.id] = u
      }
    }

    if (agentIds.size > 0) {
      const { data: agents } = await (adminClient as any)
        .from('deployed_agents')
        .select('id, name')
        .in('id', Array.from(agentIds))

      for (const a of agents || []) {
        agentsMap[a.id] = a
      }
    }

    // 메시지에 sender 정보 추가
    const messagesWithSenders = ((messages as any[]) || []).map((msg: any) => ({
      ...msg,
      sender_user: msg.sender_user_id ? usersMap[msg.sender_user_id] : null,
      sender_agent: msg.sender_agent_id ? agentsMap[msg.sender_agent_id] : null,
    }))

    // 읽음 처리 - last_read_at 업데이트
    await (adminClient as any)
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id)

    // 역순으로 정렬하여 반환 (오래된 순)
    return NextResponse.json(messagesWithSenders?.reverse() || [])
  } catch (error) {
    console.error('Messages fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 메시지 전송
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  console.log('[Messages API] POST 요청 시작')
  try {
    const supabase = createClient()
    const adminClient = createAdminClient()

    // DEV 바이패스 체크
    const devUser = getDevUserIfEnabled()
    let user: any = null

    if (devUser) {
      console.log('[Messages API] DEV 바이패스 활성화:', devUser.id)
      user = devUser
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      console.log('[Messages API] 인증 결과:', authUser?.id, authError?.message)
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = params
    console.log('[Messages API] roomId:', roomId)
    const body: SendMessageRequest = await request.json()
    const { content, message_type = 'text', metadata = {}, reply_to_id } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // 참여자인지 확인
    const { data: participant } = await (adminClient as any)
      .from('chat_participants')
      .select('id, participant_type')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 메시지 생성
    const { data: message, error } = await (adminClient as any)
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_type: 'user',
        sender_user_id: user.id,
        message_type,
        content: content.trim(),
        metadata,
        reply_to_id,
        is_ai_response: false,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Failed to send message:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // AI 에이전트가 있는 방이면 자동 응답 트리거 (adminClient로 RLS 우회)
    console.log('[Messages API] 메시지 저장 완료, 에이전트 응답 트리거 시작')
    await triggerAgentResponse(adminClient, roomId, message)
    console.log('[Messages API] 에이전트 응답 트리거 완료')

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// AI 에이전트 자동 응답 트리거 (오케스트레이터 사용)
async function triggerAgentResponse(
  supabase: any,
  roomId: string,
  userMessage: any
) {
  try {
    // 방에 참여한 에이전트 조회
    const agents = await getRoomAgents(supabase, roomId)
    console.log(`[Agent Response] Room ${roomId}: Found ${agents?.length || 0} agents`)
    if (!agents || agents.length === 0) {
      console.log('[Agent Response] No agents found in room')
      return
    }

    // 채팅방 정보 조회
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('name, type, is_meeting_active, meeting_topic')
      .eq('id', roomId)
      .single()

    // 에이전트가 1개면 기존 방식 (빠른 응답), 여러 개면 오케스트레이터
    if (agents.length === 1) {
      // 기존 단일 에이전트 방식
      generateAgentResponseHandler(supabase, roomId, agents[0], userMessage).catch((err) =>
        console.error(`Agent ${agents[0].id} response error:`, err)
      )
    } else {
      // 멀티 에이전트 오케스트레이터
      triggerMultiAgentResponse(supabase, roomId, agents, userMessage, room).catch((err) =>
        console.error('Multi-agent response error:', err)
      )
    }
  } catch (error) {
    console.error('Trigger agent response error:', error)
  }
}

// 멀티 에이전트 응답 처리 (메모리 시스템 통합)
async function triggerMultiAgentResponse(
  supabase: any,
  roomId: string,
  agents: any[],
  userMessage: any,
  room: any
) {
  try {
    // 모든 에이전트 타이핑 상태 활성화
    for (const agent of agents) {
      await supabase
        .from('chat_participants')
        .update({ is_typing: true })
        .eq('room_id', roomId)
        .eq('agent_id', agent.id)
    }

    // 메모리가 포함된 오케스트레이터 실행
    // - 각 에이전트의 기억을 로드하여 컨텍스트에 추가
    // - 응답 후 대화 내용 자동 기록
    // - 에이전트 간 협업 기록
    const responses = await processAgentResponsesWithMemory(
      supabase,
      agents,
      userMessage.content,
      {
        roomId,
        roomName: room?.name,
        roomType: room?.type,
        isMeeting: room?.is_meeting_active,
        meetingTopic: room?.meeting_topic,
      }
    )

    // 각 응답을 메시지로 저장
    for (const response of responses) {
      const dbMessage = convertToDbMessage(response, roomId)
      await supabase.from('chat_messages').insert(dbMessage)

      // 중요한 대화에서 지식 추출 (비동기, 백그라운드)
      extractKnowledgeFromConversation(
        supabase,
        response.agentId,
        userMessage.content,
        response.content
      ).catch(err => console.error('Knowledge extraction error:', err))
    }
  } catch (error) {
    console.error('Multi-agent orchestration error:', error)

    // 에러 메시지 저장
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_type: 'agent',
      sender_agent_id: agents[0]?.id,
      message_type: 'text',
      content: '죄송합니다. 멀티 에이전트 처리 중 오류가 발생했습니다.',
      is_ai_response: true,
      metadata: { error: true },
    })
  } finally {
    // 모든 에이전트 타이핑 상태 해제
    for (const agent of agents) {
      await supabase
        .from('chat_participants')
        .update({ is_typing: false })
        .eq('room_id', roomId)
        .eq('agent_id', agent.id)
    }
  }
}

// AI 에이전트 응답 생성 (메모리 시스템 통합)
async function generateAgentResponseHandler(
  supabase: any,
  roomId: string,
  agent: any,
  userMessage: any
) {
  console.log(`[generateAgentResponse] 시작 - Agent: ${agent.name} (${agent.id})`)
  const memoryService = getMemoryService(supabase)

  try {
    // 타이핑 상태 업데이트
    console.log('[generateAgentResponse] 타이핑 상태 업데이트')
    await supabase
      .from('chat_participants')
      .update({ is_typing: true })
      .eq('room_id', roomId)
      .eq('agent_id', agent.id)

    // 채팅방 정보 조회
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('name, type, is_meeting_active, meeting_topic, project_id')
      .eq('id', roomId)
      .single()

    // 에이전트 메모리 컨텍스트 로드
    let memoryContext = ''
    let identityInfo: any = null
    try {
      const memory = await memoryService.loadFullContext(agent.id, {
        roomId,
        projectId: room?.project_id,
        query: userMessage.content,
      })
      memoryContext = memory.contextSummary
      identityInfo = memory.identity
    } catch (memError) {
      console.error(`Failed to load memory for agent ${agent.id}:`, memError)
    }

    // 참여자 조회
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id, agent_id')
      .eq('room_id', roomId)

    // 참여자 이름 가져오기
    const userIds = participants?.filter((p: any) => p.user_id).map((p: any) => p.user_id) || []
    const agentIds = participants?.filter((p: any) => p.agent_id).map((p: any) => p.agent_id) || []

    let participantNames: string[] = []

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('name')
        .in('id', userIds)
      participantNames = participantNames.concat(users?.map((u: any) => u.name) || [])
    }

    if (agentIds.length > 0) {
      const { data: agentList } = await supabase
        .from('deployed_agents')
        .select('name')
        .in('id', agentIds)
      participantNames = participantNames.concat(agentList?.map((a: any) => a.name) || [])
    }

    // 최근 메시지 기록 조회
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('content, sender_type, sender_user_id, sender_agent_id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(15)

    // 메모리가 포함된 시스템 프롬프트 생성
    let enhancedSystemPrompt = agent.system_prompt || `당신은 ${agent.name}입니다.`

    // 정체성 정보 추가
    if (identityInfo) {
      enhancedSystemPrompt += `\n\n## 나의 정체성
${identityInfo.selfSummary || ''}

나의 핵심 가치: ${(identityInfo.coreValues || []).join(', ')}
나의 강점: ${(identityInfo.strengths || []).join(', ')}
최근 집중 분야: ${identityInfo.recentFocus || '없음'}`
    }

    // 메모리 컨텍스트 추가
    if (memoryContext) {
      enhancedSystemPrompt += `\n\n## 내가 기억하는 것들
${memoryContext}

위 기억을 바탕으로 일관성 있게 응답하세요. 이전에 한 말이나 결정을 기억하고 참조하세요.`
    }

    // LangChain을 사용한 응답 생성
    let response: string

    if (room?.is_meeting_active && room?.meeting_topic) {
      // 미팅 모드: 에이전트 간 토론
      const otherAgentIds = agentIds.filter((id: string) => id !== agent.id)
      let otherAgents: { name: string; role: string }[] = []

      if (otherAgentIds.length > 0) {
        const { data: otherAgentData } = await supabase
          .from('deployed_agents')
          .select('name')
          .in('id', otherAgentIds)
        otherAgents = otherAgentData?.map((a: any) => ({ name: a.name, role: 'AI 에이전트' })) || []
      }

      // 에이전트 설정을 LangChain 형식으로 변환 (메모리 포함)
      // 강제: Ollama 로컬 LLM 사용 (OpenAI 비용 문제)
      const agentWithConfig = {
        ...agent,
        config: {
          llm_provider: 'llama' as const,
          llm_model: 'deepseek-r1:7b',
          temperature: agent.temperature || 0.7,
          custom_prompt: enhancedSystemPrompt,
        }
      }

      response = await generateAgentMeetingResponse(
        agentWithConfig,
        room.meeting_topic,
        recentMessages?.reverse() || [],
        otherAgents
      )
    } else {
      // 일반 채팅 모드 (메모리 포함)
      // 강제: Ollama 로컬 LLM 사용 (OpenAI 비용 문제)
      const agentWithConfig = {
        ...agent,
        config: {
          llm_provider: 'llama' as const,
          llm_model: 'deepseek-r1:7b',
          temperature: agent.temperature || 0.7,
          custom_prompt: enhancedSystemPrompt,
        }
      }

      console.log('[generateAgentResponse] LangChain 응답 생성 시작, 모델: deepseek-r1:7b')
      response = await generateAgentChatResponse(
        agentWithConfig,
        userMessage.content,
        recentMessages?.reverse() || [],
        {
          roomName: room?.name || '채팅방',
          roomType: room?.type,
          participantNames,
        }
      )
      console.log('[generateAgentResponse] LangChain 응답 생성 완료:', response?.slice(0, 100))
    }

    // 에이전트 응답 메시지 저장
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_type: 'agent',
      sender_agent_id: agent.id,
      message_type: 'text',
      content: response,
      is_ai_response: true,
      metadata: {
        model: agent.model || 'gpt-4o-mini',
        provider: 'openai',
        agent_name: agent.name,
        has_memory: !!memoryContext,
      },
    })

    // 대화 로그 기록 (메모리 시스템)
    try {
      await memoryService.logConversation(
        agent.id,
        roomId,
        userMessage.content,
        response,
        {
          room_name: room?.name,
          room_type: room?.type,
          is_meeting: room?.is_meeting_active,
          meeting_topic: room?.meeting_topic,
          project_id: room?.project_id,
        }
      )
    } catch (logError) {
      console.error(`Failed to log conversation for agent ${agent.id}:`, logError)
    }

    // 중요한 대화에서 지식 추출 (비동기, 백그라운드)
    extractKnowledgeFromConversation(
      supabase,
      agent.id,
      userMessage.content,
      response
    ).catch(err => console.error('Knowledge extraction error:', err))

  } catch (error: any) {
    console.error(`Agent ${agent.id} response generation failed:`)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Full error:', JSON.stringify(error, null, 2))

    // 에러 시 폴백 메시지
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_type: 'agent',
      sender_agent_id: agent.id,
      message_type: 'text',
      content: `죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`,
      is_ai_response: true,
      metadata: {
        error: true,
        agent_name: agent.name,
      },
    })
  } finally {
    // 타이핑 상태 해제
    await supabase
      .from('chat_participants')
      .update({ is_typing: false })
      .eq('room_id', roomId)
      .eq('agent_id', agent.id)
  }
}
