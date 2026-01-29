/**
 * Self-Healing - Healing Executor
 *
 * 치유 액션 실행 엔진
 * - HITL 승인 게이트
 * - 액션 실행 및 결과 추적
 * - 롤백 및 에스컬레이션
 */

import { createAdminClient } from '@/lib/supabase/server'
import type {
  AgentHealingRecord,
  HealingAction,
  HealingStatus,
  DiagnosisResult,
} from '../types'
import {
  HEALING_ACTION_REGISTRY,
  validateHealingAction,
  canExecuteWithoutApproval,
  prioritizeActions,
} from './healing-actions'
import { diagnose } from './diagnosis-engine'

// ============================================================================
// Types
// ============================================================================

export interface ExecutionResult {
  success: boolean
  action: HealingAction
  startedAt: string
  completedAt: string
  durationMs: number
  output?: Record<string, unknown>
  error?: string
}

export interface HealingSession {
  recordId: string
  agentId: string
  status: HealingStatus
  actions: HealingAction[]
  executedActions: ExecutionResult[]
  currentActionIndex: number
  requiresApproval: boolean
  approvedBy?: string
  approvedAt?: string
}

// ============================================================================
// Healing Executor Service
// ============================================================================

/**
 * 치유 세션 시작
 */
export async function startHealingSession(
  agentId: string,
  diagnosis: DiagnosisResult
): Promise<HealingSession | null> {
  const supabase = createAdminClient()

  try {
    // 우선순위에 따라 액션 정렬
    const prioritizedActions = prioritizeActions(diagnosis.recommendedActions)

    // 승인 필요 여부 결정
    const requiresApproval = prioritizedActions.some(
      (action) => !canExecuteWithoutApproval(action)
    )

    // 치유 레코드 생성
    const { data: record, error } = await supabase
      .from('agent_healing_records' as any)
      .insert({
        agent_id: agentId,
        issue_type: diagnosis.issueType,
        issue_description: diagnosis.description,
        issue_description_kr: diagnosis.descriptionKr,
        issue_severity: diagnosis.severity,
        diagnosis: diagnosis as any,
        healing_action: prioritizedActions as any,
        requires_approval: requiresApproval,
        status: requiresApproval ? 'awaiting_approval' : 'healing',
      } as any)
      .select()
      .single()

    if (error) throw error

    const recordData = record as any
    const session: HealingSession = {
      recordId: recordData.id,
      agentId,
      status: requiresApproval ? 'awaiting_approval' : 'healing',
      actions: prioritizedActions,
      executedActions: [],
      currentActionIndex: 0,
      requiresApproval,
    }

    // 승인 불필요 시 바로 실행
    if (!requiresApproval) {
      return await executeHealingSession(session)
    }

    console.log(`[HealingExecutor] Session ${recordData.id} awaiting approval`)
    return session
  } catch (error) {
    console.error('[HealingExecutor] Failed to start session:', error)
    return null
  }
}

/**
 * 치유 세션 승인
 */
export async function approveHealingSession(
  recordId: string,
  approvedBy: string
): Promise<HealingSession | null> {
  const supabase = createAdminClient()

  try {
    // 레코드 조회
    const { data: record, error: fetchError } = await supabase
      .from('agent_healing_records' as any)
      .select('*')
      .eq('id', recordId)
      .single()

    if (fetchError || !record) {
      throw new Error('Healing record not found')
    }

    const recordData = record as any
    if (recordData.status !== 'awaiting_approval') {
      throw new Error(`Cannot approve record in status: ${recordData.status}`)
    }

    // 승인 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const healingQuery = supabase.from('agent_healing_records' as any)
    const { error: updateError } = await (healingQuery.update as any)({
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      status: 'healing',
    }).eq('id', recordId)

    if (updateError) throw updateError

    // 세션 구성 및 실행
    const session: HealingSession = {
      recordId: recordData.id,
      agentId: recordData.agent_id,
      status: 'healing',
      actions: recordData.healing_action as HealingAction[],
      executedActions: [],
      currentActionIndex: 0,
      requiresApproval: true,
      approvedBy,
      approvedAt: new Date().toISOString(),
    }

    return await executeHealingSession(session)
  } catch (error) {
    console.error('[HealingExecutor] Approval failed:', error)
    return null
  }
}

/**
 * 치유 세션 거부
 */
export async function rejectHealingSession(
  recordId: string,
  rejectedBy: string,
  reason?: string
): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rejectQuery = supabase.from('agent_healing_records' as any)
    const { error } = await (rejectQuery.update as any)({
      status: 'escalated',
      healing_result: {
        rejected: true,
        rejectedBy,
        rejectedAt: new Date().toISOString(),
        reason: reason || 'Rejected by user',
      },
    }).eq('id', recordId)

    if (error) throw error

    console.log(`[HealingExecutor] Session ${recordId} rejected`)
    return true
  } catch (error) {
    console.error('[HealingExecutor] Rejection failed:', error)
    return false
  }
}

/**
 * 치유 세션 실행
 */
async function executeHealingSession(
  session: HealingSession
): Promise<HealingSession> {
  const supabase = createAdminClient()

  console.log(`[HealingExecutor] Executing session ${session.recordId}`)

  try {
    for (let i = session.currentActionIndex; i < session.actions.length; i++) {
      const action = session.actions[i]
      session.currentActionIndex = i

      // 액션 검증
      const validation = validateHealingAction(action)
      if (!validation.valid) {
        console.warn(`[HealingExecutor] Invalid action skipped:`, validation.errors)
        continue
      }

      // 액션 실행
      const result = await executeAction(session.agentId, action)
      session.executedActions.push(result)

      // 실패 시 중단 및 롤백 고려
      if (!result.success) {
        console.error(`[HealingExecutor] Action failed:`, result.error)

        // 리스크 레벨이 높은 액션 실패 시 에스컬레이션
        if (action.riskLevel === 'high' || action.riskLevel === 'medium') {
          session.status = 'escalated'
          break
        }
        // 안전한 액션은 계속 진행
      }
    }

    // 최종 상태 결정
    const allSucceeded = session.executedActions.every((r) => r.success)
    const anyFailed = session.executedActions.some((r) => !r.success)

    if (session.status !== 'escalated') {
      session.status = allSucceeded ? 'healed' : anyFailed ? 'failed' : 'healed'
    }

    // 레코드 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionQuery = supabase.from('agent_healing_records' as any)
    await (sessionQuery.update as any)({
      status: session.status,
      healing_result: {
        executedActions: session.executedActions,
        completedAt: new Date().toISOString(),
        totalActions: session.actions.length,
        successfulActions: session.executedActions.filter((r) => r.success).length,
      },
    }).eq('id', session.recordId)

    console.log(`[HealingExecutor] Session ${session.recordId} completed: ${session.status}`)
    return session
  } catch (error) {
    console.error('[HealingExecutor] Execution failed:', error)

    session.status = 'failed'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failedQuery = supabase.from('agent_healing_records' as any)
    await (failedQuery.update as any)({
      status: 'failed',
      healing_result: {
        error: error instanceof Error ? error.message : 'Unknown error',
        executedActions: session.executedActions,
      },
    }).eq('id', session.recordId)

    return session
  }
}

// ============================================================================
// Action Executors
// ============================================================================

/**
 * 개별 액션 실행
 */
async function executeAction(
  agentId: string,
  action: HealingAction
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString()
  const startTime = Date.now()

  try {
    let output: Record<string, unknown> = {}

    switch (action.type) {
      case 'retry_with_backoff':
        output = await executeRetryWithBackoff(agentId, action.params)
        break

      case 'refresh_connection':
        output = await executeRefreshConnection(agentId, action.params)
        break

      case 'clear_cache':
        output = await executeClearCache(agentId, action.params)
        break

      case 'reset_state':
        output = await executeResetState(agentId, action.params)
        break

      case 'use_fallback':
        output = await executeUseFallback(agentId, action.params)
        break

      case 'notify_admin':
        output = await executeNotifyAdmin(agentId, action.params)
        break

      case 'auto_restart':
        output = await executeAutoRestart(agentId, action.params)
        break

      case 'custom':
        output = await executeCustomAction(agentId, action.params)
        break

      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }

    return {
      success: true,
      action,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      output,
    }
  } catch (error) {
    return {
      success: false,
      action,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 백오프 재시도 실행
 */
async function executeRetryWithBackoff(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  const maxRetries = params?.maxRetries ?? 3
  const initialDelayMs = params?.initialDelayMs ?? 1000
  const maxDelayMs = params?.maxDelayMs ?? 30000

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 실패한 작업 재시도 로직
      // 실제 구현에서는 실패한 작업의 컨텍스트를 받아서 재실행
      console.log(`[HealingExecutor] Retry attempt ${attempt}/${maxRetries}`)

      // 성공 시뮬레이션 (실제 구현에서는 실제 작업 재시도)
      await sleep(100)

      return {
        attempts: attempt,
        succeeded: true,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
        await sleep(delay)
      }
    }
  }

  return {
    attempts: maxRetries,
    succeeded: false,
    lastError: lastError?.message,
  }
}

/**
 * 연결 새로고침 실행
 */
async function executeRefreshConnection(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  const target = params?.target ?? 'all'

  console.log(`[HealingExecutor] Refreshing connection to: ${target}`)

  // 연결 새로고침 로직
  // 실제 구현에서는 LLM 연결, DB 연결 등을 재설정

  return {
    target,
    refreshed: true,
    refreshedAt: new Date().toISOString(),
  }
}

/**
 * 캐시 클리어 실행
 */
async function executeClearCache(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const target = params?.target ?? 'all'
  const aggressive = params?.aggressive ?? false

  console.log(`[HealingExecutor] Clearing cache: ${target} (aggressive: ${aggressive})`)

  // 캐시 클리어 예시 - 에이전트 관련 임시 데이터 정리
  if (target === 'all' || target === 'memories') {
    // 오래된 실행 메모리 정리
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - (aggressive ? 1 : 7))

    await supabase
      .from('agent_memories')
      .delete()
      .eq('agent_id', agentId)
      .eq('layer', 'execution')
      .lt('created_at', cutoffDate.toISOString())
  }

  return {
    target,
    aggressive,
    clearedAt: new Date().toISOString(),
  }
}

/**
 * 상태 리셋 실행
 */
async function executeResetState(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const scope = params?.scope ?? 'current_task'

  console.log(`[HealingExecutor] Resetting state: ${scope}`)

  switch (scope) {
    case 'current_task':
      // 현재 태스크 상태만 리셋
      // 실제 구현에서는 진행 중인 태스크 취소 및 초기화
      break

    case 'agent': {
      // 에이전트 통계 일부 리셋
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentsQuery = supabase.from('agents' as any)
      await (agentsQuery.update as any)({
        stats: {
          resetAt: new Date().toISOString(),
          resetReason: 'self_healing',
        },
      }).eq('id', agentId)
      break
    }

    case 'all':
      // 전체 상태 리셋 (위험)
      console.warn('[HealingExecutor] Full state reset requested')
      break
  }

  return {
    scope,
    resetAt: new Date().toISOString(),
  }
}

/**
 * 폴백 사용 실행
 */
async function executeUseFallback(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  const fallbackProvider = params?.fallbackProvider ?? 'default'

  console.log(`[HealingExecutor] Switching to fallback: ${fallbackProvider}`)

  // 폴백 프로바이더로 전환 로직
  // 실제 구현에서는 에이전트의 LLM 프로바이더 설정 변경

  return {
    fallbackProvider,
    switchedAt: new Date().toISOString(),
    note: 'Fallback provider activated',
  }
}

/**
 * 관리자 알림 실행
 */
async function executeNotifyAdmin(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const severity = params?.severity ?? 'medium'

  console.log(`[HealingExecutor] Notifying admin (severity: ${severity})`)

  // 에이전트 소유자 조회
  const { data: agent } = await supabase
    .from('agents' as any)
    .select('owner_id, name')
    .eq('id', agentId)
    .single()

  const agentData = agent as any
  if (agentData?.owner_id) {
    // 알림 생성
    await supabase.from('notifications' as any).insert({
      user_id: agentData.owner_id,
      type: 'self_healing_alert',
      title: `Agent ${agentData.name} requires attention`,
      message: `Self-healing system detected an issue (severity: ${severity})`,
      data: { agentId, severity },
    } as any)
  }

  return {
    severity,
    notifiedAt: new Date().toISOString(),
    notified: !!agentData?.owner_id,
  }
}

/**
 * 자동 재시작 실행
 */
async function executeAutoRestart(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  const graceful = params?.graceful ?? true

  console.log(`[HealingExecutor] Auto restart: ${graceful ? 'graceful' : 'force'}`)

  if (graceful) {
    // 정상 종료 대기 후 재시작
    // 실제 구현에서는 진행 중인 작업 완료 대기
    await sleep(1000)
  }

  // 에이전트 상태 초기화
  // 실제 구현에서는 에이전트 프로세스/세션 재시작

  return {
    graceful,
    restartedAt: new Date().toISOString(),
  }
}

/**
 * 커스텀 액션 실행
 */
async function executeCustomAction(
  agentId: string,
  params: any
): Promise<Record<string, unknown>> {
  console.log(`[HealingExecutor] Executing custom action:`, params)

  // 커스텀 액션 로직
  // 실제 구현에서는 params에 따라 다양한 커스텀 로직 실행

  return {
    params,
    executedAt: new Date().toISOString(),
  }
}

// ============================================================================
// Quick Healing (단순 이슈 자동 치유)
// ============================================================================

/**
 * 간단한 이슈 자동 치유 (승인 없이)
 */
export async function quickHeal(
  agentId: string,
  issueType: string,
  context?: Record<string, unknown>
): Promise<boolean> {
  try {
    // 진단 수행
    const diagnosis = await diagnose(agentId, issueType, context)
    if (!diagnosis) return false

    // 승인 없이 실행 가능한 액션만 필터링
    const safeActions = diagnosis.recommendedActions.filter(canExecuteWithoutApproval)
    if (safeActions.length === 0) return false

    // 바로 실행
    for (const action of safeActions) {
      const result = await executeAction(agentId, action)
      if (!result.success) {
        console.warn(`[HealingExecutor] Quick heal action failed:`, result.error)
      }
    }

    console.log(`[HealingExecutor] Quick heal completed for ${agentId}`)
    return true
  } catch (error) {
    console.error('[HealingExecutor] Quick heal failed:', error)
    return false
  }
}

// ============================================================================
// Healing Status
// ============================================================================

/**
 * 치유 상태 조회
 */
export async function getHealingStatus(recordId: string): Promise<AgentHealingRecord | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agent_healing_records' as any)
    .select('*')
    .eq('id', recordId)
    .single()

  if (error) {
    console.error('[HealingExecutor] Failed to get status:', error)
    return null
  }

  // DB snake_case → camelCase 변환
  const record = data as any
  return {
    id: record.id,
    agentId: record.agent_id,
    issueType: record.issue_type,
    issueDescription: record.issue_description,
    issueDescriptionKr: record.issue_description_kr,
    issueSeverity: record.issue_severity,
    diagnosis: record.diagnosis,
    healingAction: record.healing_action,
    requiresApproval: record.requires_approval,
    approvedBy: record.approved_by,
    approvedAt: record.approved_at,
    status: record.status,
    healingResult: record.healing_result,
    createdAt: record.created_at,
    resolvedAt: record.resolved_at,
  } as AgentHealingRecord
}

/**
 * 에이전트의 활성 치유 세션 조회
 */
export async function getActiveHealingSessions(
  agentId: string
): Promise<AgentHealingRecord[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agent_healing_records' as any)
    .select('*')
    .eq('agent_id', agentId)
    .in('status', ['detected', 'diagnosing', 'awaiting_approval', 'healing'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[HealingExecutor] Failed to get active sessions:', error)
    return []
  }

  // DB snake_case → camelCase 변환
  return ((data || []) as any[]).map((record) => ({
    id: record.id,
    agentId: record.agent_id,
    issueType: record.issue_type,
    issueDescription: record.issue_description,
    issueDescriptionKr: record.issue_description_kr,
    issueSeverity: record.issue_severity,
    diagnosis: record.diagnosis,
    healingAction: record.healing_action,
    requiresApproval: record.requires_approval,
    approvedBy: record.approved_by,
    approvedAt: record.approved_at,
    status: record.status,
    healingResult: record.healing_result,
    createdAt: record.created_at,
    resolvedAt: record.resolved_at,
  } as AgentHealingRecord))
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
