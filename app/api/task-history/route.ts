import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 작업 타입 매핑
function mapLogTypeToTaskType(logType: string, metadata?: Record<string, any>): string {
  // metadata의 appType이 있으면 사용
  if (metadata?.appType) {
    return metadata.appType
  }

  // logType 기반 매핑
  switch (logType) {
    case 'conversation':
      return 'chat'
    case 'task_work':
      return metadata?.taskType || 'ai-sheet'
    case 'analysis':
      return 'ai-summary'
    case 'decision':
    case 'learning':
      return 'ai-docs'
    default:
      return 'chat'
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()

    // DEV 모드 체크
    const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'
    const userId = user?.id || (DEV_BYPASS_AUTH ? '00000000-0000-0000-0000-000000000001' : null)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URL 파라미터
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 여러 테이블에서 작업 기록 조회
    const tasks: any[] = []

    // 1. chat_participants에서 내가 참여한 채팅방 ID 조회
    const { data: myParticipations } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', userId) as { data: any[] | null }

    if (myParticipations && myParticipations.length > 0 && (!type || type === 'chat')) {
      const myRoomIds = myParticipations.map((p: any) => p.room_id)

      // 채팅방 정보 조회
      const { data: chatRooms } = await supabase
        .from('chat_rooms')
        .select('id, name, type, last_message_at, created_at, updated_at')
        .in('id', myRoomIds)
        .order('last_message_at', { ascending: false })
        .limit(limit) as { data: any[] | null }

      // 각 채팅방의 마지막 메시지 조회
      if (chatRooms && chatRooms.length > 0) {
        const { data: lastMessages } = await supabase
          .from('chat_messages')
          .select('room_id, content, created_at')
          .in('room_id', chatRooms.map(r => r.id))
          .order('created_at', { ascending: false }) as { data: any[] | null }

        // room_id별 마지막 메시지 매핑
        const lastMessageMap: Record<string, any> = {}
        for (const msg of lastMessages || []) {
          if (!lastMessageMap[msg.room_id]) {
            lastMessageMap[msg.room_id] = msg
          }
        }

        chatRooms.forEach((room: any) => {
          const lastMsg = lastMessageMap[room.id]
          tasks.push({
            id: room.id,
            type: 'chat',
            title: room.name || '새 대화',
            preview: lastMsg?.content?.slice(0, 100) || '',
            createdAt: room.created_at,
            updatedAt: room.last_message_at || room.updated_at,
          })
        })
      }
    }

    // 3. agent_conversations 테이블에서 에이전트 대화 조회
    const { data: agentConversations } = await supabase
      .from('agent_conversations')
      .select('id, title, agent_id, last_message_at, created_at')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(limit) as { data: any[] | null }

    if (agentConversations && agentConversations.length > 0 && (!type || type === 'chat')) {
      // 에이전트 정보 조회
      const agentIds = [...new Set(agentConversations.map(c => c.agent_id).filter(Boolean))]
      let agentsMap: Record<string, any> = {}

      if (agentIds.length > 0) {
        const { data: agents } = await supabase
          .from('deployed_agents')
          .select('id, name')
          .in('id', agentIds) as { data: any[] | null }

        for (const agent of agents || []) {
          agentsMap[agent.id] = agent
        }
      }

      // 마지막 메시지 조회
      const { data: lastAgentMessages } = await supabase
        .from('agent_chat_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', agentConversations.map(c => c.id))
        .order('created_at', { ascending: false }) as { data: any[] | null }

      const lastAgentMsgMap: Record<string, any> = {}
      for (const msg of lastAgentMessages || []) {
        if (!lastAgentMsgMap[msg.conversation_id]) {
          lastAgentMsgMap[msg.conversation_id] = msg
        }
      }

      agentConversations.forEach((conv: any) => {
        const agent = agentsMap[conv.agent_id]
        const lastMsg = lastAgentMsgMap[conv.id]
        tasks.push({
          id: conv.id,
          type: 'chat',
          title: conv.title || (agent ? `${agent.name}와의 대화` : '에이전트 대화'),
          preview: lastMsg?.content?.slice(0, 100) || '',
          createdAt: conv.created_at,
          updatedAt: conv.last_message_at,
          metadata: { agent: agent?.name, agentId: conv.agent_id },
        })
      })
    }

    // 5. documents 테이블에서 문서 작업 조회 (있다면)
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, content, doc_type, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit) as { data: any[] | null }

    if (documents) {
      documents.forEach((doc: any) => {
        const docType = doc.doc_type || 'ai-docs'
        if (!type || docType === type) {
          tasks.push({
            id: doc.id,
            type: docType,
            title: doc.title || '문서',
            preview: doc.content?.slice(0, 100),
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
          })
        }
      })
    }

    // 6. spreadsheets 테이블에서 시트 작업 조회 (있다면)
    const { data: sheets } = await supabase
      .from('spreadsheets')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit) as { data: any[] | null }

    if (sheets && (!type || type === 'ai-sheet')) {
      sheets.forEach((sheet: any) => {
        tasks.push({
          id: sheet.id,
          type: 'ai-sheet',
          title: sheet.title || 'AI 시트',
          createdAt: sheet.created_at,
          updatedAt: sheet.updated_at,
        })
      })
    }

    // 7. super_agent_chats 테이블에서 Super Agent 채팅 조회 (Admin client로 RLS 우회)
    try {
      const adminClient = createAdminClient()
      console.log('[TaskHistory] Querying super_agent_chats for userId:', userId)

      const { data: superChats, error: superChatsError } = await adminClient
        .from('super_agent_chats')
        .select('id, title, preview, metadata, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      console.log('[TaskHistory] super_agent_chats result:', superChats?.length || 0, 'error:', superChatsError)

      if (superChats && (!type || type === 'chat')) {
        superChats.forEach((chat: any) => {
          tasks.push({
            id: chat.id,
            type: 'chat',
            title: chat.title || 'Super Agent 대화',
            preview: chat.preview,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
            metadata: chat.metadata,
          })
        })
      }
    } catch (e) {
      // 테이블이 없을 수 있음
      console.log('super_agent_chats table error:', e)
    }

    // 날짜순 정렬 (최신순)
    tasks.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt).getTime()
      return dateB - dateA
    })

    // 중복 제거 및 페이지네이션
    const uniqueTasks = tasks.filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    ).slice(offset, offset + limit)

    return NextResponse.json({
      tasks: uniqueTasks,
      total: tasks.length,
      hasMore: offset + limit < tasks.length,
    })

  } catch (error) {
    console.error('Task history API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch task history',
      tasks: []
    }, { status: 500 })
  }
}
