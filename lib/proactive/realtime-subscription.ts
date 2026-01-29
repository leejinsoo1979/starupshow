/**
 * Proactive Engine - Realtime Subscription Service
 *
 * Supabase Realtime을 통해 능동적 제안 및 자가치유 이벤트를 실시간 구독
 * - proactive_suggestions 테이블 INSERT/UPDATE 구독
 * - agent_healing_records 테이블 구독 (승인 대기 알림)
 */

import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { ProactiveSuggestion, AgentHealingRecord } from './types'

// ============================================================================
// Types
// ============================================================================

export interface ProactiveRealtimeCallbacks {
  onNewSuggestion?: (suggestion: ProactiveSuggestion) => void
  onSuggestionUpdate?: (suggestion: ProactiveSuggestion) => void
  onHealingRecord?: (record: AgentHealingRecord) => void
  onHealingApprovalNeeded?: (record: AgentHealingRecord) => void
  onError?: (error: Error) => void
}

export interface ProactiveSubscription {
  unsubscribe: () => void
  isActive: () => boolean
}

// ============================================================================
// Subscription Manager
// ============================================================================

let activeChannel: RealtimeChannel | null = null
let subscriptionCallbacks: ProactiveRealtimeCallbacks = {}

/**
 * 능동적 엔진 실시간 구독 시작
 */
export function subscribeToProactiveEvents(
  agentId: string,
  callbacks: ProactiveRealtimeCallbacks
): ProactiveSubscription {
  // 기존 구독 해제
  if (activeChannel) {
    console.log('[ProactiveRealtime] Unsubscribing from existing channel')
    activeChannel.unsubscribe()
  }

  subscriptionCallbacks = callbacks
  const supabase = createClient()

  // 채널 생성
  activeChannel = supabase
    .channel(`proactive-${agentId}`)
    // proactive_suggestions 테이블 구독
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'proactive_suggestions',
        filter: `agent_id=eq.${agentId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        handleSuggestionInsert(payload)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'proactive_suggestions',
        filter: `agent_id=eq.${agentId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        handleSuggestionUpdate(payload)
      }
    )
    // agent_healing_records 테이블 구독
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agent_healing_records',
        filter: `agent_id=eq.${agentId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        handleHealingRecord(payload)
      }
    )
    .subscribe((status) => {
      console.log(`[ProactiveRealtime] Subscription status: ${status}`)
      if (status === 'CHANNEL_ERROR') {
        callbacks.onError?.(new Error('Realtime channel error'))
      }
    })

  return {
    unsubscribe: () => {
      if (activeChannel) {
        activeChannel.unsubscribe()
        activeChannel = null
      }
    },
    isActive: () => activeChannel !== null,
  }
}

/**
 * 모든 구독 해제
 */
export function unsubscribeFromProactiveEvents(): void {
  if (activeChannel) {
    console.log('[ProactiveRealtime] Unsubscribing from all channels')
    activeChannel.unsubscribe()
    activeChannel = null
    subscriptionCallbacks = {}
  }
}

// ============================================================================
// Payload Handlers
// ============================================================================

function handleSuggestionInsert(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): void {
  try {
    const suggestion = transformToSuggestion(payload.new)
    console.log('[ProactiveRealtime] New suggestion received:', suggestion.id)
    subscriptionCallbacks.onNewSuggestion?.(suggestion)
  } catch (error) {
    console.error('[ProactiveRealtime] Failed to handle suggestion insert:', error)
    subscriptionCallbacks.onError?.(error as Error)
  }
}

function handleSuggestionUpdate(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): void {
  try {
    const suggestion = transformToSuggestion(payload.new)
    console.log('[ProactiveRealtime] Suggestion updated:', suggestion.id, suggestion.status)
    subscriptionCallbacks.onSuggestionUpdate?.(suggestion)
  } catch (error) {
    console.error('[ProactiveRealtime] Failed to handle suggestion update:', error)
    subscriptionCallbacks.onError?.(error as Error)
  }
}

function handleHealingRecord(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): void {
  try {
    const record = transformToHealingRecord(payload.new)
    console.log('[ProactiveRealtime] Healing record event:', record.id, record.status)

    subscriptionCallbacks.onHealingRecord?.(record)

    // 승인 대기 상태면 별도 콜백
    if (record.status === 'awaiting_approval' && record.requiresApproval) {
      subscriptionCallbacks.onHealingApprovalNeeded?.(record)
    }
  } catch (error) {
    console.error('[ProactiveRealtime] Failed to handle healing record:', error)
    subscriptionCallbacks.onError?.(error as Error)
  }
}

// ============================================================================
// Transform Helpers (snake_case DB → camelCase TypeScript)
// ============================================================================

function transformToSuggestion(data: Record<string, unknown>): ProactiveSuggestion {
  return {
    id: data.id as string,
    agentId: data.agent_id as string,
    userId: data.user_id as string | undefined,
    suggestionType: data.suggestion_type as ProactiveSuggestion['suggestionType'],
    title: data.title as string,
    titleKr: data.title_kr as string,
    message: data.message as string,
    messageKr: data.message_kr as string,
    priority: data.priority as ProactiveSuggestion['priority'],
    status: data.status as ProactiveSuggestion['status'],
    confidenceScore: data.confidence_score as number,
    context: (data.context as Record<string, unknown>) || {},
    suggestedAction: data.suggested_action as ProactiveSuggestion['suggestedAction'] | undefined,
    sourcePatternId: data.pattern_id as string | undefined,
    sourceMemoryIds: (data.source_memory_ids as string[]) || [],
    sourceLearningIds: (data.source_learning_ids as string[]) || [],
    createdAt: data.created_at as string,
    deliveredAt: data.delivered_at as string | undefined,
    respondedAt: data.responded_at as string | undefined,
    expiresAt: data.expires_at as string | undefined,
    metadata: (data.metadata as Record<string, unknown>) || {},
  }
}

function transformToHealingRecord(data: Record<string, unknown>): AgentHealingRecord {
  return {
    id: data.id as string,
    agentId: data.agent_id as string,
    issueType: data.issue_type as AgentHealingRecord['issueType'],
    issueDescription: data.issue_description as string,
    issueDescriptionKr: (data.issue_description_kr as string) || '',
    issueSeverity: data.issue_severity as AgentHealingRecord['issueSeverity'],
    diagnosis: data.diagnosis as AgentHealingRecord['diagnosis'] | undefined,
    healingAction: data.healing_action as AgentHealingRecord['healingAction'] | undefined,
    requiresApproval: (data.requires_approval as boolean) || false,
    approvedBy: data.approved_by as string | undefined,
    approvedAt: data.approved_at as string | undefined,
    status: data.status as AgentHealingRecord['status'],
    createdAt: data.created_at as string,
    resolvedAt: data.resolved_at as string | undefined,
  }
}

// ============================================================================
// React Hook Helper
// ============================================================================

/**
 * React 컴포넌트에서 사용할 수 있는 구독 헬퍼
 * useEffect에서 사용:
 *
 * useEffect(() => {
 *   const sub = subscribeToProactiveEvents(agentId, {
 *     onNewSuggestion: (s) => addSuggestion(s),
 *   })
 *   return () => sub.unsubscribe()
 * }, [agentId])
 */
export function createProactiveSubscriptionEffect(
  agentId: string,
  callbacks: ProactiveRealtimeCallbacks
): () => void {
  const subscription = subscribeToProactiveEvents(agentId, callbacks)
  return () => subscription.unsubscribe()
}
