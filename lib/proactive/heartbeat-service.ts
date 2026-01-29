/**
 * Proactive Engine - Heartbeat Service
 *
 * 에이전트의 주기적 자가점검 및 능동적 행동 트리거
 * - 스케줄된 하트비트 (15분마다 Cron)
 * - 이벤트 기반 하트비트 (대화/태스크 완료 시)
 * - 실시간 하트비트 (Supabase Realtime)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type {
  HeartbeatType,
  HeartbeatResult,
  HeartbeatLog,
  TriggerContext,
  TriggerEventType,
  ProactiveSuggestion,
  ProactivePattern,
  AgentHealingRecord,
  CreateSuggestionInput,
  CreateHealingRecordInput,
} from './types'

// ============================================================================
// Types
// ============================================================================

interface HeartbeatConfig {
  agentId: string
  heartbeatType: HeartbeatType
  checkPatterns?: boolean
  checkHealth?: boolean
  generateSuggestions?: boolean
}

interface AgentStats {
  trustScore: number
  successRate: number
  totalInteractions: number
  level: number
}

// ============================================================================
// Heartbeat Service
// ============================================================================

/**
 * 단일 에이전트에 대한 하트비트 실행
 */
export async function runHeartbeat(config: HeartbeatConfig): Promise<HeartbeatResult> {
  const startTime = Date.now()
  const supabase = createAdminClient()

  let patternsDetected = 0
  let suggestionsGenerated = 0
  let issuesDetected = 0
  let statsSnapshot: AgentStats | undefined

  try {
    // 1. 에이전트 스탯 스냅샷 가져오기
    const { data: stats } = await supabase
      .from('agent_stats' as any)
      .select('trust_score, success_rate, total_interactions, level')
      .eq('agent_id', config.agentId)
      .single()

    if (stats) {
      const statsData = stats as any
      statsSnapshot = {
        trustScore: statsData.trust_score ?? 0,
        successRate: statsData.success_rate ?? 0,
        totalInteractions: statsData.total_interactions ?? 0,
        level: statsData.level ?? 1,
      }
    }

    // 2. 패턴 체크 (활성 패턴 평가)
    if (config.checkPatterns !== false) {
      const patternResults = await evaluateActivePatterns(config.agentId)
      patternsDetected = patternResults.matchedPatterns.length
      suggestionsGenerated += patternResults.suggestionsCreated
    }

    // 3. 헬스 체크 (자가치유 필요 여부)
    if (config.checkHealth !== false) {
      const healthResults = await checkAgentHealth(config.agentId)
      issuesDetected = healthResults.issuesFound
    }

    // 4. 만료된 제안 처리
    await expireOldSuggestions(config.agentId)

    // 5. 하트비트 로그 저장
    const durationMs = Date.now() - startTime
    await saveHeartbeatLog({
      agentId: config.agentId,
      heartbeatType: config.heartbeatType,
      patternsDetected,
      suggestionsGenerated,
      issuesDetected,
      statsSnapshot: statsSnapshot as Record<string, unknown> | undefined,
      durationMs,
    })

    return {
      agentId: config.agentId,
      heartbeatType: config.heartbeatType,
      patternsDetected,
      suggestionsGenerated,
      issuesDetected,
      statsSnapshot,
      durationMs,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`[Heartbeat] Error for agent ${config.agentId}:`, error)
    throw error
  }
}

/**
 * 모든 활성 에이전트에 대해 배치 하트비트 실행 (Cron용)
 */
export async function runBatchHeartbeat(): Promise<{
  success: boolean
  results: HeartbeatResult[]
  errors: string[]
}> {
  const supabase = createAdminClient()
  const results: HeartbeatResult[] = []
  const errors: string[] = []

  try {
    // 활성 에이전트 목록 가져오기
    const { data: agents, error } = await supabase
      .from('deployed_agents' as any)
      .select('id')
      .eq('status', 'active')

    if (error) throw error

    if (!agents || agents.length === 0) {
      console.log('[Heartbeat] No active agents found')
      return { success: true, results: [], errors: [] }
    }

    console.log(`[Heartbeat] Running batch heartbeat for ${agents.length} agents`)

    // 각 에이전트에 대해 하트비트 실행
    for (const agentRow of agents as any[]) {
      try {
        const result = await runHeartbeat({
          agentId: agentRow.id,
          heartbeatType: 'scheduled',
        })
        results.push(result)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Agent ${agentRow.id}: ${errorMessage}`)
        console.error(`[Heartbeat] Failed for agent ${agentRow.id}:`, errorMessage)
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    }
  } catch (error) {
    console.error('[Heartbeat] Batch heartbeat failed:', error)
    throw error
  }
}

// ============================================================================
// Pattern Evaluation
// ============================================================================

interface PatternEvaluationResult {
  matchedPatterns: ProactivePattern[]
  suggestionsCreated: number
}

/**
 * 활성 패턴 평가 및 제안 생성
 */
async function evaluateActivePatterns(agentId: string): Promise<PatternEvaluationResult> {
  const supabase = createAdminClient()
  const matchedPatterns: ProactivePattern[] = []
  let suggestionsCreated = 0

  try {
    // 활성 패턴 가져오기
    const { data: patterns, error } = await supabase
      .from('proactive_patterns' as any)
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)

    if (error || !patterns) return { matchedPatterns: [], suggestionsCreated: 0 }

    const now = new Date()

    for (const patternRow of patterns as any[]) {
      const rules = patternRow.detection_rules as any

      // 쿨다운 체크
      if (rules.cooldownMinutes && patternRow.last_occurrence_at) {
        const lastOccurrence = new Date(patternRow.last_occurrence_at)
        const cooldownEnd = new Date(lastOccurrence.getTime() + rules.cooldownMinutes * 60 * 1000)
        if (now < cooldownEnd) continue
      }

      // 트리거 타입별 평가
      let shouldTrigger = false

      switch (rules.trigger) {
        case 'time_based':
          shouldTrigger = evaluateTimeBasedTrigger(rules.schedule, now)
          break
        case 'threshold_based':
          shouldTrigger = await evaluateThresholdTrigger(agentId, rules.threshold)
          break
        case 'event_based':
          // 이벤트 기반은 별도 처리 (onEvent에서 호출)
          break
      }

      if (shouldTrigger) {
        matchedPatterns.push(patternRow as any)

        // 제안 생성
        const suggestion = await createSuggestionFromPattern(agentId, patternRow as any)
        if (suggestion) {
          suggestionsCreated++
        }

        // 패턴 발생 횟수 업데이트
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patternUpdateQuery = supabase.from('proactive_patterns' as any)
        await (patternUpdateQuery.update as any)({
          occurrence_count: (patternRow.occurrence_count || 0) + 1,
          last_occurrence_at: now.toISOString(),
          confidence_score: Math.min(95, (patternRow.confidence_score || 50) + 2),
        }).eq('id', patternRow.id)
      }
    }

    return { matchedPatterns, suggestionsCreated }
  } catch (error) {
    console.error(`[Pattern] Evaluation failed for agent ${agentId}:`, error)
    return { matchedPatterns: [], suggestionsCreated: 0 }
  }
}

/**
 * 시간 기반 트리거 평가 (간단한 cron 체크)
 */
function evaluateTimeBasedTrigger(schedule: string, now: Date): boolean {
  // 간단한 cron 파싱 (분 시 일 월 요일)
  // 예: "0 9 * * 1" = 매주 월요일 9시
  if (!schedule) return false

  try {
    const parts = schedule.split(' ')
    if (parts.length !== 5) return false

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

    const currentMinute = now.getMinutes()
    const currentHour = now.getHours()
    const currentDayOfMonth = now.getDate()
    const currentMonth = now.getMonth() + 1
    const currentDayOfWeek = now.getDay()

    // 분 체크 (15분 단위 허용)
    if (minute !== '*' && Math.abs(parseInt(minute) - currentMinute) > 7) return false

    // 시간 체크
    if (hour !== '*' && parseInt(hour) !== currentHour) return false

    // 일 체크
    if (dayOfMonth !== '*' && parseInt(dayOfMonth) !== currentDayOfMonth) return false

    // 월 체크
    if (month !== '*' && parseInt(month) !== currentMonth) return false

    // 요일 체크
    if (dayOfWeek !== '*' && parseInt(dayOfWeek) !== currentDayOfWeek) return false

    return true
  } catch {
    return false
  }
}

/**
 * 임계값 기반 트리거 평가
 */
async function evaluateThresholdTrigger(
  agentId: string,
  threshold: { metric: string; operator: string; value: number }
): Promise<boolean> {
  if (!threshold) return false

  const supabase = createAdminClient()

  try {
    // 메트릭에 따라 값 조회
    let currentValue: number | null = null

    switch (threshold.metric) {
      case 'trust_score':
      case 'success_rate':
      case 'total_interactions': {
        const { data } = await supabase
          .from('agent_stats' as any)
          .select(threshold.metric)
          .eq('agent_id', agentId)
          .single()
        currentValue = data?.[threshold.metric as keyof typeof data] ?? null
        break
      }
      case 'pending_suggestions': {
        const { count } = await supabase
          .from('proactive_suggestions' as any)
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .eq('status', 'pending')
        currentValue = count ?? 0
        break
      }
    }

    if (currentValue === null) return false

    // 비교
    switch (threshold.operator) {
      case 'gt':
        return currentValue > threshold.value
      case 'gte':
        return currentValue >= threshold.value
      case 'lt':
        return currentValue < threshold.value
      case 'lte':
        return currentValue <= threshold.value
      default:
        return false
    }
  } catch {
    return false
  }
}

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * 패턴에서 제안 생성
 */
async function createSuggestionFromPattern(
  agentId: string,
  pattern: ProactivePattern
): Promise<ProactiveSuggestion | null> {
  const supabase = createAdminClient()

  try {
    // 제안 타입 매핑
    const suggestionTypeMap: Record<string, string> = {
      recurring_task: 'task_reminder',
      time_preference: 'proactive_offer',
      user_behavior: 'proactive_offer',
      error_pattern: 'error_alert',
      relationship_milestone: 'relationship_nudge',
      skill_gap: 'skill_suggestion',
    }

    const suggestionType = suggestionTypeMap[pattern.patternType] || 'proactive_offer'

    // 제안 생성
    const { data, error } = await supabase
      .from('proactive_suggestions' as any)
      .insert({
        agent_id: agentId,
        suggestion_type: suggestionType,
        title: `Pattern: ${pattern.patternName}`,
        title_kr: `패턴: ${pattern.patternNameKr}`,
        message: pattern.patternDescription || `Detected pattern: ${pattern.patternName}`,
        message_kr: pattern.patternDescriptionKr || `패턴 감지됨: ${pattern.patternNameKr}`,
        source_pattern_id: pattern.id,
        confidence_score: pattern.confidenceScore,
        priority: pattern.confidenceScore >= 80 ? 'high' : 'medium',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48시간 후 만료
      } as any)
      .select()
      .single()

    if (error) throw error

    return data as any
  } catch (error) {
    console.error(`[Suggestion] Failed to create from pattern ${pattern.id}:`, error)
    return null
  }
}

// ============================================================================
// Health Check
// ============================================================================

interface HealthCheckResult {
  issuesFound: number
  healingRecordsCreated: number
}

/**
 * 에이전트 헬스 체크
 */
async function checkAgentHealth(agentId: string): Promise<HealthCheckResult> {
  const supabase = createAdminClient()
  let issuesFound = 0
  let healingRecordsCreated = 0

  try {
    // 1. 최근 실패한 워크플로우 체크
    const { data: failedWorkflows, error: workflowError } = await supabase
      .from('workflow_executions' as any)
      .select('id, error, workflow_id')
      .eq('agent_id', agentId)
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(10)

    if (!workflowError && failedWorkflows && failedWorkflows.length >= 3) {
      issuesFound++
      // 자가치유 레코드 생성
      await supabase.from('agent_healing_records' as any).insert({
        agent_id: agentId,
        issue_type: 'workflow_failure',
        issue_description: `${failedWorkflows.length} workflow failures in last 24 hours`,
        issue_description_kr: `최근 24시간 내 ${failedWorkflows.length}개 워크플로우 실패`,
        issue_severity: failedWorkflows.length >= 5 ? 'high' : 'medium',
        status: 'detected',
        diagnosis: {
          rootCause: 'Multiple workflow failures detected',
          rootCauseKr: '다수의 워크플로우 실패 감지됨',
          affectedComponents: ['workflow_engine'],
          suggestedActions: [
            {
              type: 'retry_with_backoff',
              params: { maxRetries: 3, initialDelayMs: 1000 },
              description: 'Retry failed workflows with exponential backoff',
              descriptionKr: '지수 백오프로 실패한 워크플로우 재시도',
              riskLevel: 'safe',
            },
          ],
          confidence: 75,
          analyzedAt: new Date().toISOString(),
        },
      } as any)
      healingRecordsCreated++
    }

    // 2. 성공률 체크
    const { data: stats } = await supabase
      .from('agent_stats' as any)
      .select('success_rate')
      .eq('agent_id', agentId)
      .single()

    if (stats && (stats as any).success_rate !== null && (stats as any).success_rate < 70) {
      issuesFound++
      await supabase.from('agent_healing_records' as any).insert({
        agent_id: agentId,
        issue_type: 'performance_degradation',
        issue_description: `Success rate dropped to ${(stats as any).success_rate}%`,
        issue_description_kr: `성공률이 ${(stats as any).success_rate}%로 하락`,
        issue_severity: (stats as any).success_rate < 50 ? 'high' : 'medium',
        status: 'detected',
        requires_approval: true,
      } as any)
      healingRecordsCreated++
    }

    return { issuesFound, healingRecordsCreated }
  } catch (error) {
    console.error(`[Health] Check failed for agent ${agentId}:`, error)
    return { issuesFound: 0, healingRecordsCreated: 0 }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 만료된 제안 처리
 */
async function expireOldSuggestions(agentId: string): Promise<number> {
  const supabase = createAdminClient()

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suggestionsQuery = supabase.from('proactive_suggestions' as any)
    const { data } = await (suggestionsQuery.update as any)({ status: 'expired' })
      .eq('agent_id', agentId)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select()

    return data?.length || 0
  } catch {
    return 0
  }
}

/**
 * 하트비트 로그 저장
 */
async function saveHeartbeatLog(log: Omit<HeartbeatLog, 'id' | 'createdAt'>): Promise<void> {
  const supabase = createAdminClient()

  try {
    await supabase.from('agent_heartbeat_log' as any).insert({
      agent_id: log.agentId,
      heartbeat_type: log.heartbeatType,
      patterns_detected: log.patternsDetected,
      suggestions_generated: log.suggestionsGenerated,
      issues_detected: log.issuesDetected,
      stats_snapshot: log.statsSnapshot,
      duration_ms: log.durationMs,
    } as any)
  } catch (error) {
    console.error('[Heartbeat] Failed to save log:', error)
  }
}

// ============================================================================
// Event-Triggered Heartbeat
// ============================================================================

/**
 * 이벤트 발생 시 호출되는 트리거 평가
 */
export async function onEvent(context: TriggerContext): Promise<void> {
  const { agentId, eventType } = context

  console.log(`[Heartbeat] Event triggered: ${eventType} for agent ${agentId}`)

  try {
    // 이벤트 타입에 따른 하트비트 실행
    await runHeartbeat({
      agentId,
      heartbeatType: 'event_triggered',
      checkPatterns: true,
      checkHealth: eventType === 'task_failed' || eventType === 'workflow_failed',
      generateSuggestions: true,
    })
  } catch (error) {
    console.error(`[Heartbeat] Event trigger failed:`, error)
  }
}

/**
 * 대화 완료 시 호출
 */
export async function onConversationComplete(agentId: string, userId?: string): Promise<void> {
  await onEvent({
    agentId,
    userId,
    eventType: 'conversation_complete',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 태스크 완료 시 호출
 */
export async function onTaskComplete(agentId: string, taskId: string, success: boolean): Promise<void> {
  await onEvent({
    agentId,
    eventType: success ? 'task_complete' : 'task_failed',
    eventData: { taskId, success },
    taskId,
    timestamp: new Date().toISOString(),
  })
}

/**
 * 워크플로우 완료 시 호출
 */
export async function onWorkflowComplete(
  agentId: string,
  workflowId: string,
  success: boolean
): Promise<void> {
  await onEvent({
    agentId,
    eventType: success ? 'workflow_complete' : 'workflow_failed',
    eventData: { workflowId, success },
    workflowId,
    timestamp: new Date().toISOString(),
  })
}
