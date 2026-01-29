/**
 * Self-Healing - Diagnosis Engine
 *
 * 에이전트 문제 진단 시스템
 * - 문제 감지 및 분류
 * - 근본 원인 분석
 * - 치유 액션 추천
 */

import { createAdminClient } from '@/lib/supabase/server'
import type {
  IssueType,
  IssueSeverity,
  Diagnosis,
  HealingAction,
  DiagnosisResult,
} from '../types'

// ============================================================================
// Types
// ============================================================================

interface DiagnosisContext {
  agentId: string
  issueType: IssueType
  errorMessage?: string
  errorStack?: string
  taskId?: string
  workflowId?: string
  additionalContext?: Record<string, unknown>
}

// ============================================================================
// Diagnosis Engine
// ============================================================================

/**
 * 문제 진단 (issueType이 명확할 때)
 */
export async function diagnose(
  agentId: string,
  issueType: IssueType | string,
  context?: Record<string, unknown>
): Promise<DiagnosisResult | null> {
  try {
    const validIssueType = issueType as IssueType

    const diagnosisContext: DiagnosisContext = {
      agentId,
      issueType: validIssueType,
      errorMessage: context?.error as string,
      taskId: context?.taskId as string,
      workflowId: context?.workflowId as string,
      additionalContext: context,
    }

    // 진단 수행
    const diagnosis = await performDiagnosis(diagnosisContext)

    // 심각도 결정
    const severity = determineSeverity(validIssueType, diagnosis)

    return {
      issueType: validIssueType,
      severity,
      description: diagnosis.rootCause,
      descriptionKr: diagnosis.rootCauseKr,
      recommendedActions: diagnosis.suggestedActions,
      rootCause: diagnosis.rootCause,
      rootCauseKr: diagnosis.rootCauseKr,
      affectedComponents: diagnosis.affectedComponents,
      confidence: diagnosis.confidence,
      analyzedAt: diagnosis.analyzedAt,
    }
  } catch (error) {
    console.error('[Diagnosis] Failed:', error)
    return null
  }
}

/**
 * 잠재적 문제 진단 (태스크/워크플로우 실패 시)
 */
export async function diagnosePotentialIssues(
  agentId: string,
  context?: {
    taskId?: string
    workflowId?: string
    error?: string
    executionSteps?: any[]
  }
): Promise<DiagnosisResult | null> {
  const supabase = createAdminClient()

  try {
    // 최근 유사한 실패가 있는지 확인
    const { data: recentFailures } = await supabase
      .from('agent_healing_records' as any)
      .select('issue_type, status, created_at')
      .eq('agent_id', agentId)
      .in('status', ['detected', 'awaiting_approval', 'healing'])
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1시간 내

    // 이미 처리 중인 유사한 문제가 있으면 스킵
    if (recentFailures && recentFailures.length > 0) {
      console.log(`[Diagnosis] Skipping - already handling ${recentFailures.length} issues`)
      return null
    }

    // 문제 유형 결정
    const issueType = determineIssueType(context?.error || '')

    return await diagnose(agentId, issueType, {
      error: context?.error,
      taskId: context?.taskId,
      workflowId: context?.workflowId,
      executionSteps: context?.executionSteps,
    })
  } catch (error) {
    console.error('[Diagnosis] Potential issues check failed:', error)
    return null
  }
}

// ============================================================================
// Diagnosis Logic
// ============================================================================

/**
 * 문제 유형별 진단 수행
 */
async function performDiagnosis(context: DiagnosisContext): Promise<Diagnosis> {
  const { issueType, errorMessage } = context

  switch (issueType) {
    case 'workflow_failure':
      return diagnoseWorkflowFailure(context)

    case 'api_connection_error':
      return diagnoseApiConnectionError(context)

    case 'state_stuck':
      return diagnoseStateStuck(context)

    case 'performance_degradation':
      return diagnosePerformanceDegradation(context)

    case 'memory_overflow':
      return diagnoseMemoryOverflow(context)

    case 'knowledge_base_corruption':
      return diagnoseKnowledgeBaseCorruption(context)

    default:
      return {
        rootCause: `Unknown issue: ${errorMessage || issueType}`,
        rootCauseKr: `알 수 없는 문제: ${errorMessage || issueType}`,
        affectedComponents: ['unknown'],
        suggestedActions: [getDefaultHealingAction()],
        confidence: 30,
        analyzedAt: new Date().toISOString(),
      }
  }
}

/**
 * 워크플로우 실패 진단
 */
async function diagnoseWorkflowFailure(context: DiagnosisContext): Promise<Diagnosis> {
  const { agentId, workflowId, errorMessage } = context
  const supabase = createAdminClient()

  // 실패 패턴 분석
  const { data: failures } = await supabase
    .from('workflow_executions' as any)
    .select('error, step_results, created_at')
    .eq('agent_id', agentId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5)

  const commonErrors = analyzeCommonErrors((failures as any)?.map((f: any) => f.error) || [])

  // 에러 메시지 기반 원인 분석
  let rootCause = 'Workflow execution failed'
  let rootCauseKr = '워크플로우 실행 실패'
  const suggestedActions: HealingAction[] = []

  if (errorMessage?.includes('timeout')) {
    rootCause = 'Workflow timed out - possibly due to slow external API'
    rootCauseKr = '워크플로우 타임아웃 - 외부 API 응답 지연 가능성'
    suggestedActions.push({
      type: 'retry_with_backoff',
      params: { maxRetries: 3, initialDelayMs: 2000, maxDelayMs: 30000 },
      description: 'Retry with exponential backoff',
      descriptionKr: '지수 백오프로 재시도',
      estimatedDurationMs: 60000,
      riskLevel: 'safe',
    })
  } else if (errorMessage?.includes('rate limit') || errorMessage?.includes('429')) {
    rootCause = 'API rate limit exceeded'
    rootCauseKr = 'API 호출 제한 초과'
    suggestedActions.push({
      type: 'retry_with_backoff',
      params: { maxRetries: 3, initialDelayMs: 60000, maxDelayMs: 300000 },
      description: 'Wait and retry after rate limit reset',
      descriptionKr: '제한 해제 후 재시도',
      estimatedDurationMs: 300000,
      riskLevel: 'safe',
    })
  } else if (errorMessage?.includes('auth') || errorMessage?.includes('401')) {
    rootCause = 'Authentication failed - credentials may be expired'
    rootCauseKr = '인증 실패 - 자격 증명 만료 가능성'
    suggestedActions.push({
      type: 'refresh_connection',
      params: { target: 'auth' },
      description: 'Refresh authentication credentials',
      descriptionKr: '인증 자격 증명 새로고침',
      estimatedDurationMs: 5000,
      riskLevel: 'low',
    })
  } else {
    // 기본 재시도
    suggestedActions.push({
      type: 'retry_with_backoff',
      params: { maxRetries: 3, initialDelayMs: 1000 },
      description: 'Retry workflow execution',
      descriptionKr: '워크플로우 재실행',
      estimatedDurationMs: 30000,
      riskLevel: 'safe',
    })
  }

  // 알림 액션 추가
  suggestedActions.push({
    type: 'notify_admin',
    params: { severity: 'medium' },
    description: 'Notify administrator if retries fail',
    descriptionKr: '재시도 실패 시 관리자에게 알림',
    riskLevel: 'safe',
  })

  return {
    rootCause,
    rootCauseKr,
    affectedComponents: ['workflow_engine', workflowId || 'unknown'].filter(Boolean),
    suggestedActions,
    confidence: commonErrors.confidence,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * API 연결 에러 진단
 */
async function diagnoseApiConnectionError(context: DiagnosisContext): Promise<Diagnosis> {
  const { errorMessage } = context

  let affectedApi = 'unknown'
  if (errorMessage?.includes('openai')) affectedApi = 'OpenAI'
  else if (errorMessage?.includes('google')) affectedApi = 'Google'
  else if (errorMessage?.includes('supabase')) affectedApi = 'Supabase'

  return {
    rootCause: `Connection to ${affectedApi} API failed`,
    rootCauseKr: `${affectedApi} API 연결 실패`,
    affectedComponents: ['api_client', affectedApi.toLowerCase()],
    suggestedActions: [
      {
        type: 'refresh_connection',
        params: { target: affectedApi.toLowerCase() },
        description: `Refresh ${affectedApi} connection`,
        descriptionKr: `${affectedApi} 연결 새로고침`,
        estimatedDurationMs: 5000,
        riskLevel: 'safe',
      },
      {
        type: 'use_fallback',
        params: { fallbackProvider: 'alternative' },
        description: 'Use fallback API provider',
        descriptionKr: '대체 API 제공자 사용',
        estimatedDurationMs: 1000,
        riskLevel: 'low',
      },
    ],
    confidence: 75,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * 상태 멈춤 진단
 */
async function diagnoseStateStuck(context: DiagnosisContext): Promise<Diagnosis> {
  return {
    rootCause: 'Agent state appears to be stuck in an incomplete operation',
    rootCauseKr: '에이전트 상태가 불완전한 작업에서 멈춤',
    affectedComponents: ['state_machine', 'task_executor'],
    suggestedActions: [
      {
        type: 'reset_state',
        params: { scope: 'current_task' },
        description: 'Reset current task state',
        descriptionKr: '현재 태스크 상태 리셋',
        estimatedDurationMs: 2000,
        riskLevel: 'medium',
      },
      {
        type: 'clear_cache',
        params: { target: 'task_cache' },
        description: 'Clear task cache',
        descriptionKr: '태스크 캐시 클리어',
        estimatedDurationMs: 1000,
        riskLevel: 'safe',
      },
    ],
    confidence: 60,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * 성능 저하 진단
 */
async function diagnosePerformanceDegradation(context: DiagnosisContext): Promise<Diagnosis> {
  const supabase = createAdminClient()

  // 성능 메트릭 확인
  const { data: stats } = await supabase
    .from('agent_stats' as any)
    .select('success_rate, avg_response_time_seconds')
    .eq('agent_id', context.agentId)
    .single()

  const successRate = (stats as any)?.success_rate ?? 100
  const avgResponseTime = (stats as any)?.avg_response_time_seconds ?? 0

  let rootCause = 'Performance degradation detected'
  let rootCauseKr = '성능 저하 감지됨'

  if (successRate < 50) {
    rootCause = `Success rate dropped to ${successRate}%`
    rootCauseKr = `성공률이 ${successRate}%로 하락`
  } else if (avgResponseTime > 30) {
    rootCause = `Average response time is ${avgResponseTime}s (too slow)`
    rootCauseKr = `평균 응답 시간이 ${avgResponseTime}초 (너무 느림)`
  }

  return {
    rootCause,
    rootCauseKr,
    affectedComponents: ['performance', 'executor'],
    suggestedActions: [
      {
        type: 'clear_cache',
        params: { target: 'all' },
        description: 'Clear all caches to improve performance',
        descriptionKr: '성능 개선을 위해 모든 캐시 클리어',
        estimatedDurationMs: 3000,
        riskLevel: 'safe',
      },
      {
        type: 'auto_restart',
        params: { graceful: true },
        description: 'Gracefully restart agent processes',
        descriptionKr: '에이전트 프로세스 안전 재시작',
        estimatedDurationMs: 10000,
        riskLevel: 'medium',
      },
    ],
    confidence: 70,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * 메모리 오버플로우 진단
 */
async function diagnoseMemoryOverflow(context: DiagnosisContext): Promise<Diagnosis> {
  return {
    rootCause: 'Memory usage exceeded safe limits',
    rootCauseKr: '메모리 사용량이 안전 한계 초과',
    affectedComponents: ['memory', 'context_window'],
    suggestedActions: [
      {
        type: 'clear_cache',
        params: { target: 'memory', aggressive: true },
        description: 'Aggressively clear memory caches',
        descriptionKr: '메모리 캐시 적극적 정리',
        estimatedDurationMs: 5000,
        riskLevel: 'low',
      },
      {
        type: 'auto_restart',
        params: { graceful: true },
        description: 'Restart to free memory',
        descriptionKr: '메모리 해제를 위한 재시작',
        estimatedDurationMs: 10000,
        riskLevel: 'medium',
      },
    ],
    confidence: 85,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * 지식베이스 손상 진단
 */
async function diagnoseKnowledgeBaseCorruption(context: DiagnosisContext): Promise<Diagnosis> {
  return {
    rootCause: 'Knowledge base data appears corrupted or inconsistent',
    rootCauseKr: '지식베이스 데이터 손상 또는 불일치',
    affectedComponents: ['knowledge_base', 'embeddings'],
    suggestedActions: [
      {
        type: 'custom',
        params: { action: 'rebuild_index' },
        description: 'Rebuild knowledge base index',
        descriptionKr: '지식베이스 인덱스 재구축',
        estimatedDurationMs: 60000,
        riskLevel: 'medium',
      },
      {
        type: 'notify_admin',
        params: { severity: 'high' },
        description: 'Alert administrator for manual review',
        descriptionKr: '수동 검토를 위해 관리자에게 알림',
        riskLevel: 'safe',
      },
    ],
    confidence: 50,
    analyzedAt: new Date().toISOString(),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 에러 메시지에서 문제 유형 결정
 */
export function determineIssueType(errorMessage: string): IssueType {
  const message = errorMessage.toLowerCase()

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'workflow_failure'
  }
  if (message.includes('connection') || message.includes('network') || message.includes('fetch')) {
    return 'api_connection_error'
  }
  if (message.includes('memory') || message.includes('heap')) {
    return 'memory_overflow'
  }
  if (message.includes('stuck') || message.includes('hung') || message.includes('deadlock')) {
    return 'state_stuck'
  }
  if (message.includes('corrupt') || message.includes('invalid data')) {
    return 'knowledge_base_corruption'
  }
  if (message.includes('slow') || message.includes('performance')) {
    return 'performance_degradation'
  }

  return 'workflow_failure' // 기본값
}

/**
 * 심각도 결정
 */
export function determineSeverity(issueType: IssueType, diagnosis: Diagnosis): IssueSeverity {
  // 유형 기반 기본 심각도
  const typeBasedSeverity: Record<IssueType, IssueSeverity> = {
    workflow_failure: 'medium',
    api_connection_error: 'medium',
    knowledge_base_corruption: 'high',
    state_stuck: 'high',
    performance_degradation: 'medium',
    memory_overflow: 'high',
  }

  const baseSeverity = typeBasedSeverity[issueType] || 'medium'

  // 신뢰도가 낮으면 심각도 낮춤
  if (diagnosis.confidence < 50) {
    return baseSeverity === 'critical' ? 'high' : baseSeverity === 'high' ? 'medium' : 'low'
  }

  return baseSeverity
}

/**
 * HITL 승인 필요 여부 결정
 */
function shouldRequireApproval(severity: IssueSeverity, diagnosis: Diagnosis): boolean {
  // critical 심각도는 항상 승인 필요
  if (severity === 'critical') return true

  // high 심각도이면서 위험도 높은 액션이 있으면 승인 필요
  if (severity === 'high') {
    const hasRiskyAction = diagnosis.suggestedActions.some(
      (a) => a.riskLevel === 'high' || a.riskLevel === 'medium'
    )
    if (hasRiskyAction) return true
  }

  // 낮은 신뢰도면 승인 필요
  if (diagnosis.confidence < 60) return true

  return false
}

/**
 * 공통 에러 패턴 분석
 */
function analyzeCommonErrors(errors: (string | null)[]): { patterns: string[]; confidence: number } {
  const validErrors = errors.filter(Boolean) as string[]
  if (validErrors.length === 0) return { patterns: [], confidence: 50 }

  // 간단한 에러 패턴 분석
  const errorCounts: Record<string, number> = {}
  for (const error of validErrors) {
    const key = error.slice(0, 50) // 처음 50자로 그룹화
    errorCounts[key] = (errorCounts[key] || 0) + 1
  }

  const patterns = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern]) => pattern)

  // 반복되는 에러가 많을수록 신뢰도 높음
  const maxCount = Math.max(...Object.values(errorCounts))
  const confidence = Math.min(90, 50 + maxCount * 10)

  return { patterns, confidence }
}

/**
 * 기본 치유 액션
 */
function getDefaultHealingAction(): HealingAction {
  return {
    type: 'notify_admin',
    params: { severity: 'medium' },
    description: 'Unable to determine automatic fix - notifying administrator',
    descriptionKr: '자동 수정 불가 - 관리자에게 알림',
    riskLevel: 'safe',
  }
}
