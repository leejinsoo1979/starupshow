/**
 * Immutable Memory Service
 *
 * 실시간으로 모든 이벤트를 장기 메모리에 저장하는 서비스
 * - 대화, 태스크, 문서, 이메일, 미팅, 의사결정 등
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { MemoryEventType, MemoryRole } from '@/types/memory'

// 에이전트 ID → 이름 매핑 (캐시)
const agentNameCache: Record<string, string> = {}

interface SaveMemoryParams {
  userId: string
  content: string
  eventType: MemoryEventType
  role: MemoryRole
  ownerAgentId?: string | null  // 이 메모리를 소유하는 에이전트 (에이전트별 독립 메모리)
  sourceAgent?: string | null
  sourceAgentId?: string | null
  sourceModel?: string | null
  sessionId?: string | null
  parentId?: string | null
  context?: Record<string, any>
  timestamp?: string
}

/**
 * 에이전트 ID로 에이전트 이름 조회
 */
async function getAgentName(agentId: string): Promise<string> {
  if (agentNameCache[agentId]) {
    return agentNameCache[agentId]
  }

  try {
    const supabase = createAdminClient()
    const { data } = await (supabase as any)
      .from('deployed_agents')
      .select('name')
      .eq('id', agentId)
      .single()

    if (data?.name) {
      agentNameCache[agentId] = data.name
      return data.name
    }
  } catch (error) {
    console.error('[MemoryService] Failed to get agent name:', error)
  }

  return agentId // 이름을 찾지 못하면 ID 반환
}

/**
 * 메모리 저장
 */
export async function saveMemory(params: SaveMemoryParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 에이전트 이름 확인
    let sourceAgent = params.sourceAgent
    if (!sourceAgent && params.sourceAgentId) {
      sourceAgent = await getAgentName(params.sourceAgentId)
    }

    const memoryRecord = {
      user_id: params.userId,
      owner_agent_id: params.ownerAgentId || null,  // 에이전트별 독립 메모리
      timestamp: params.timestamp || new Date().toISOString(),
      raw_content: params.content,
      event_type: params.eventType,
      role: params.role,
      source_agent: sourceAgent || null,
      source_model: params.sourceModel || null,
      session_id: params.sessionId || null,
      parent_id: params.parentId || null,
      context: params.context || {},
    }

    const { data, error } = await (supabase as any)
      .from('immutable_memory')
      .insert(memoryRecord)
      .select('id')
      .single()

    if (error) {
      console.error('[MemoryService] Failed to save memory:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id as string }
  } catch (error) {
    console.error('[MemoryService] Error saving memory:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 대화 메모리 저장 (채팅 메시지)
 * ownerAgentId: 대화 상대 에이전트 (이 대화가 어떤 에이전트의 메모리인지)
 */
export async function saveConversationMemory(params: {
  userId: string
  content: string
  role: 'user' | 'assistant' | 'agent'
  ownerAgentId: string  // 필수: 이 대화를 소유하는 에이전트 ID
  agentId?: string | null  // 메시지를 보낸 에이전트 (assistant인 경우)
  agentName?: string | null
  conversationId?: string | null
  emotion?: string | null
  messageId?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.content,
    eventType: 'conversation',
    role: params.role === 'agent' ? 'assistant' : params.role,
    ownerAgentId: params.ownerAgentId,  // 에이전트별 독립 메모리
    sourceAgentId: params.role === 'assistant' ? params.agentId || params.ownerAgentId : undefined,
    sourceAgent: params.role === 'assistant' ? params.agentName : undefined,
    sessionId: params.conversationId || undefined,
    context: {
      conversation_id: params.conversationId,
      emotion: params.emotion,
      original_message_id: params.messageId,
    },
  })
}

/**
 * 태스크 메모리 저장
 * ownerAgentId: 태스크를 수행하는 에이전트 (이 태스크가 어떤 에이전트의 메모리인지)
 */
export async function saveTaskMemory(params: {
  userId: string
  taskId: string
  title: string
  description?: string | null
  status: string
  agentId?: string | null  // 태스크를 수행하는 에이전트 = ownerAgentId
  agentName?: string | null
  projectId?: string | null
  result?: string | null
  error?: string | null
  isCompleted?: boolean
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const content = params.title + (params.description ? ': ' + params.description : '') +
    (params.result ? '\n\n결과: ' + params.result : '') +
    (params.error ? '\n\n에러: ' + params.error : '')

  return saveMemory({
    userId: params.userId,
    content,
    eventType: params.isCompleted ? 'task_completed' : 'task_created',
    role: 'system',
    ownerAgentId: params.agentId || undefined,  // 에이전트별 독립 메모리
    sourceAgentId: params.agentId || undefined,
    sourceAgent: params.agentName || undefined,
    context: {
      task_id: params.taskId,
      project_id: params.projectId,
      status: params.status,
      result: params.result,
      error: params.error,
    },
  })
}

/**
 * 문서 메모리 저장
 * ownerAgentId: 문서를 생성한 에이전트 (에이전트가 생성한 경우)
 */
export async function saveDocumentMemory(params: {
  userId: string
  documentId: string
  title: string
  content: string
  docType?: string | null
  projectId?: string | null
  agentId?: string | null  // 문서를 생성한 에이전트 = ownerAgentId
  agentName?: string | null
  sourceUrl?: string | null
  tags?: string[] | null
  isUpdate?: boolean
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.title + '\n\n' + params.content,
    eventType: params.isUpdate ? 'document_updated' : 'document_created',
    role: params.agentId ? 'assistant' : 'user',
    ownerAgentId: params.agentId || undefined,  // 에이전트별 독립 메모리
    sourceAgentId: params.agentId || undefined,
    sourceAgent: params.agentName || undefined,
    context: {
      document_id: params.documentId,
      project_id: params.projectId,
      doc_type: params.docType,
      source_url: params.sourceUrl,
      tags: params.tags,
    },
  })
}

/**
 * 이메일 메모리 저장
 */
export async function saveEmailMemory(params: {
  userId: string
  emailId: string
  subject: string
  content: string
  isSent: boolean
  agentId?: string | null
  agentName?: string | null
  threadId?: string | null
  recipients?: string[] | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: `${params.subject}\n\n${params.content}`,
    eventType: params.isSent ? 'email_sent' : 'email_received',
    role: params.isSent ? 'assistant' : 'user',
    sourceAgentId: params.agentId || undefined,
    sourceAgent: params.agentName || undefined,
    context: {
      email_id: params.emailId,
      thread_id: params.threadId,
      recipients: params.recipients,
    },
  })
}

/**
 * 미팅 메모리 저장
 */
export async function saveMeetingMemory(params: {
  userId: string
  meetingId: string
  topic: string
  summary?: string | null
  participants?: string[] | null
  roomId?: string | null
  duration?: number | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.topic + (params.summary ? '\n\n요약: ' + params.summary : ''),
    eventType: 'meeting',
    role: 'system',
    context: {
      meeting_id: params.meetingId,
      room_id: params.roomId,
      participants: params.participants,
      duration_minutes: params.duration,
    },
  })
}

/**
 * 의사결정 메모리 저장
 */
export async function saveDecisionMemory(params: {
  userId: string
  decisionId?: string | null
  title: string
  description: string
  outcome?: string | null
  agentId?: string | null
  agentName?: string | null
  projectId?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.title + '\n\n' + params.description + (params.outcome ? '\n\n결과: ' + params.outcome : ''),
    eventType: 'decision',
    role: 'system',
    sourceAgentId: params.agentId || undefined,
    sourceAgent: params.agentName || undefined,
    context: {
      decision_id: params.decisionId,
      project_id: params.projectId,
      outcome: params.outcome,
    },
  })
}

/**
 * 마일스톤 메모리 저장
 */
export async function saveMilestoneMemory(params: {
  userId: string
  milestoneId?: string | null
  title: string
  description?: string | null
  projectId?: string | null
  completedAt?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.title + (params.description ? '\n\n' + params.description : ''),
    eventType: 'milestone',
    role: 'system',
    context: {
      milestone_id: params.milestoneId,
      project_id: params.projectId,
      completed_at: params.completedAt,
    },
  })
}

/**
 * AI 인사이트 메모리 저장
 */
export async function saveInsightMemory(params: {
  userId: string
  insight: string
  sourceType: string
  agentId?: string | null
  agentName?: string | null
  relatedEntityId?: string | null
  relatedEntityType?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.insight,
    eventType: 'insight',
    role: 'assistant',
    sourceAgentId: params.agentId || undefined,
    sourceAgent: params.agentName || undefined,
    context: {
      source_type: params.sourceType,
      related_entity_id: params.relatedEntityId,
      related_entity_type: params.relatedEntityType,
    },
  })
}

/**
 * 시스템 이벤트 메모리 저장
 */
export async function saveSystemMemory(params: {
  userId: string
  event: string
  details?: string | null
  metadata?: Record<string, any> | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.event + (params.details ? '\n\n' + params.details : ''),
    eventType: 'system',
    role: 'system',
    context: params.metadata || {},
  })
}

/**
 * 에러 메모리 저장
 */
export async function saveErrorMemory(params: {
  userId: string
  error: string
  context?: string | null
  agentId?: string | null
  agentName?: string | null
  stackTrace?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveMemory({
    userId: params.userId,
    content: params.error + (params.context ? '\n\n컨텍스트: ' + params.context : ''),
    eventType: 'error',
    role: 'system',
    sourceAgentId: params.agentId || undefined,
    sourceAgent: params.agentName || undefined,
    context: {
      stack_trace: params.stackTrace,
    },
  })
}

export default {
  saveMemory,
  saveConversationMemory,
  saveTaskMemory,
  saveDocumentMemory,
  saveEmailMemory,
  saveMeetingMemory,
  saveDecisionMemory,
  saveMilestoneMemory,
  saveInsightMemory,
  saveSystemMemory,
  saveErrorMemory,
}
