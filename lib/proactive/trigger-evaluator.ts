/**
 * Proactive Engine - Trigger Evaluator
 *
 * 이벤트와 패턴을 평가하여 능동적 행동 트리거
 * - 규칙 기반 평가
 * - 패턴 매칭
 * - 제안 생성 결정
 */

import { createAdminClient } from '@/lib/supabase/server'
import type {
  TriggerContext,
  TriggerEvaluationResult,
  ProactivePattern,
  PatternCondition,
  CreateSuggestionInput,
  CreateHealingRecordInput,
} from './types'
import { generateFromPattern, generateErrorAlert } from './suggestion-generator'

// ============================================================================
// Trigger Evaluator Service
// ============================================================================

/**
 * 트리거 컨텍스트 평가
 */
export async function evaluateTriggers(
  context: TriggerContext
): Promise<TriggerEvaluationResult> {
  const supabase = createAdminClient()

  const matchedPatterns: ProactivePattern[] = []
  const suggestionsToCreate: CreateSuggestionInput[] = []
  let healingNeeded = false
  let healingInput: CreateHealingRecordInput | undefined

  try {
    // 1. 이벤트 타입에 따른 패턴 평가
    const { data: patterns } = await supabase
      .from('proactive_patterns')
      .select('*')
      .eq('agent_id', context.agentId)
      .eq('is_active', true)

    if (patterns) {
      for (const pattern of patterns) {
        const rules = pattern.detection_rules as any

        // 이벤트 기반 트리거 체크
        if (rules.trigger === 'event_based' && rules.event === context.eventType) {
          // 조건 평가
          const conditionsMet = await evaluateConditions(
            context,
            rules.conditions || []
          )

          if (conditionsMet) {
            // 쿨다운 체크
            const isInCooldown = await checkCooldown(pattern)
            if (!isInCooldown) {
              matchedPatterns.push(pattern as any)

              // 제안 생성
              const suggestion = await generateFromPattern(pattern as any, {
                agentId: context.agentId,
                userId: context.userId,
                trigger: context.eventType,
                additionalContext: context.eventData,
              })

              if (suggestion) {
                // 패턴 업데이트
                await supabase
                  .from('proactive_patterns')
                  .update({
                    occurrence_count: (pattern.occurrence_count || 0) + 1,
                    last_occurrence_at: new Date().toISOString(),
                  })
                  .eq('id', pattern.id)
              }
            }
          }
        }
      }
    }

    // 2. 실패 이벤트 시 자가치유 평가
    if (context.eventType === 'task_failed' || context.eventType === 'workflow_failed') {
      healingNeeded = true
      healingInput = {
        agentId: context.agentId,
        issueType: context.eventType === 'workflow_failed' ? 'workflow_failure' : 'state_stuck',
        issueDescription: `${context.eventType} detected`,
        issueDescriptionKr: context.eventType === 'workflow_failed'
          ? '워크플로우 실패 감지됨'
          : '태스크 실패 감지됨',
        issueSeverity: 'medium',
      }

      // 에러 알림 제안 생성
      await generateErrorAlert({
        agentId: context.agentId,
        userId: context.userId,
        errorType: context.eventType,
        errorMessage: JSON.stringify(context.eventData) || 'Unknown error',
        severity: 'medium',
      })
    }

    // 3. 대화 완료 시 학습 기반 제안 평가
    if (context.eventType === 'conversation_complete') {
      await evaluateConversationCompletion(context)
    }

    return {
      shouldGenerateSuggestion: matchedPatterns.length > 0,
      matchedPatterns,
      suggestionsToCreate,
      healingNeeded,
      healingInput,
    }
  } catch (error) {
    console.error('[TriggerEvaluator] Evaluation failed:', error)
    return {
      shouldGenerateSuggestion: false,
      matchedPatterns: [],
      suggestionsToCreate: [],
      healingNeeded: false,
    }
  }
}

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * 패턴 조건 평가
 */
async function evaluateConditions(
  context: TriggerContext,
  conditions: PatternCondition[]
): Promise<boolean> {
  if (conditions.length === 0) return true

  for (const condition of conditions) {
    const { field, operator, value } = condition

    // 컨텍스트에서 필드 값 추출
    let actualValue: unknown

    switch (field) {
      case 'user_id':
        actualValue = context.userId
        break
      case 'event_type':
        actualValue = context.eventType
        break
      case 'task_id':
        actualValue = context.taskId
        break
      case 'workflow_id':
        actualValue = context.workflowId
        break
      default:
        actualValue = context.eventData?.[field]
    }

    // 조건 연산자 평가
    const conditionMet = evaluateOperator(actualValue, operator, value)
    if (!conditionMet) return false
  }

  return true
}

/**
 * 연산자 평가
 */
function evaluateOperator(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
    case 'contains':
      return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)
    case 'not_contains':
      return typeof actual === 'string' && typeof expected === 'string' && !actual.includes(expected)
    case 'exists':
      return actual !== null && actual !== undefined
    case 'not_exists':
      return actual === null || actual === undefined
    default:
      return false
  }
}

/**
 * 쿨다운 체크
 */
async function checkCooldown(pattern: any): Promise<boolean> {
  const rules = pattern.detection_rules
  const cooldownMinutes = rules?.cooldownMinutes

  if (!cooldownMinutes || !pattern.last_occurrence_at) return false

  const lastOccurrence = new Date(pattern.last_occurrence_at)
  const cooldownEnd = new Date(lastOccurrence.getTime() + cooldownMinutes * 60 * 1000)

  return new Date() < cooldownEnd
}

// ============================================================================
// Event-Specific Evaluators
// ============================================================================

/**
 * 대화 완료 시 평가
 */
async function evaluateConversationCompletion(context: TriggerContext): Promise<void> {
  const supabase = createAdminClient()

  try {
    // 관계 상호작용 횟수 업데이트 후 마일스톤 체크
    if (context.userId) {
      const { data: relationship } = await supabase
        .from('agent_relationships')
        .select('interaction_count, milestones')
        .eq('agent_id', context.agentId)
        .eq('partner_user_id', context.userId)
        .single()

      if (relationship) {
        const count = relationship.interaction_count || 0
        const milestones = [10, 50, 100, 500, 1000]

        // 마일스톤 도달 체크
        for (const milestone of milestones) {
          if (count === milestone) {
            // 마일스톤 제안 생성
            await supabase.from('proactive_suggestions').insert({
              agent_id: context.agentId,
              user_id: context.userId,
              suggestion_type: 'relationship_nudge',
              title: `${milestone} conversations milestone!`,
              title_kr: `${milestone}회 대화 달성!`,
              message: `We've had ${milestone} conversations together. Thank you for trusting me!`,
              message_kr: `우리가 ${milestone}번 대화했어요. 저를 믿어주셔서 감사합니다!`,
              priority: 'high',
              confidence_score: 100,
              context: { milestone, totalInteractions: count },
            })

            console.log(`[TriggerEvaluator] Milestone ${milestone} reached for agent ${context.agentId}`)
          }
        }
      }
    }
  } catch (error) {
    console.error('[TriggerEvaluator] Conversation completion evaluation failed:', error)
  }
}

/**
 * 태스크 완료 시 평가
 */
export async function evaluateTaskCompletion(
  agentId: string,
  taskId: string,
  success: boolean,
  taskType?: string
): Promise<void> {
  const context: TriggerContext = {
    agentId,
    eventType: success ? 'task_complete' : 'task_failed',
    eventData: { taskId, success, taskType },
    taskId,
    timestamp: new Date().toISOString(),
  }

  await evaluateTriggers(context)
}

/**
 * 워크플로우 완료 시 평가
 */
export async function evaluateWorkflowCompletion(
  agentId: string,
  workflowId: string,
  success: boolean,
  error?: string
): Promise<void> {
  const context: TriggerContext = {
    agentId,
    eventType: success ? 'workflow_complete' : 'workflow_failed',
    eventData: { workflowId, success, error },
    workflowId,
    timestamp: new Date().toISOString(),
  }

  await evaluateTriggers(context)
}

/**
 * 스케줄된 트리거 평가 (하트비트에서 호출)
 */
export async function evaluateScheduledTriggers(agentId: string): Promise<number> {
  const supabase = createAdminClient()
  let triggersEvaluated = 0

  try {
    const now = new Date()

    // 시간 기반 패턴 조회
    const { data: patterns } = await supabase
      .from('proactive_patterns')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .contains('detection_rules', { trigger: 'time_based' })

    if (!patterns) return 0

    for (const pattern of patterns) {
      const rules = pattern.detection_rules as any

      // cron 스케줄 평가
      if (rules.schedule && evaluateCronSchedule(rules.schedule, now)) {
        // 쿨다운 체크
        const isInCooldown = await checkCooldown(pattern)
        if (!isInCooldown) {
          triggersEvaluated++

          // 제안 생성
          await generateFromPattern(pattern as any, {
            agentId,
            trigger: 'scheduled',
          })

          // 패턴 업데이트
          await supabase
            .from('proactive_patterns')
            .update({
              occurrence_count: (pattern.occurrence_count || 0) + 1,
              last_occurrence_at: now.toISOString(),
            })
            .eq('id', pattern.id)
        }
      }
    }

    return triggersEvaluated
  } catch (error) {
    console.error('[TriggerEvaluator] Scheduled trigger evaluation failed:', error)
    return 0
  }
}

/**
 * 간단한 cron 스케줄 평가
 */
function evaluateCronSchedule(schedule: string, now: Date): boolean {
  try {
    const parts = schedule.split(' ')
    if (parts.length !== 5) return false

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

    // 15분 허용 범위 내 매칭
    const currentMinute = now.getMinutes()
    const currentHour = now.getHours()
    const currentDayOfMonth = now.getDate()
    const currentMonth = now.getMonth() + 1
    const currentDayOfWeek = now.getDay()

    if (minute !== '*' && Math.abs(parseInt(minute) - currentMinute) > 7) return false
    if (hour !== '*' && parseInt(hour) !== currentHour) return false
    if (dayOfMonth !== '*' && parseInt(dayOfMonth) !== currentDayOfMonth) return false
    if (month !== '*' && parseInt(month) !== currentMonth) return false
    if (dayOfWeek !== '*' && parseInt(dayOfWeek) !== currentDayOfWeek) return false

    return true
  } catch {
    return false
  }
}
