/**
 * Proactive Engine - Pattern Analyzer
 *
 * 에이전트의 메모리와 학습에서 패턴을 분석하고 감지
 * - 반복 작업 패턴 (recurring_task)
 * - 시간 선호 패턴 (time_preference)
 * - 사용자 행동 패턴 (user_behavior)
 * - 에러 패턴 (error_pattern)
 * - 관계 마일스톤 (relationship_milestone)
 * - 스킬 갭 (skill_gap)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type {
  ProactivePattern,
  PatternType,
  PatternDetectionRules,
  CreatePatternInput,
} from './types'

// ============================================================================
// Types
// ============================================================================

interface AnalysisResult {
  patternsFound: ProactivePattern[]
  patternsCreated: number
  patternsUpdated: number
}

interface MemoryAnalysisInput {
  agentId: string
  userId?: string
  lookbackDays?: number
}

// ============================================================================
// Pattern Analyzer Service
// ============================================================================

/**
 * 에이전트의 메모리에서 패턴 분석
 */
export async function analyzePatterns(input: MemoryAnalysisInput): Promise<AnalysisResult> {
  const { agentId, userId, lookbackDays = 30 } = input
  const supabase = createAdminClient()

  const patternsFound: ProactivePattern[] = []
  let patternsCreated = 0
  let patternsUpdated = 0

  const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

  try {
    // 1. 반복 작업 패턴 분석
    const recurringPatterns = await analyzeRecurringTasks(agentId, lookbackDate)
    for (const pattern of recurringPatterns) {
      const result = await upsertPattern(agentId, pattern)
      if (result.created) patternsCreated++
      else if (result.updated) patternsUpdated++
      if (result.pattern) patternsFound.push(result.pattern)
    }

    // 2. 시간 선호 패턴 분석
    const timePatterns = await analyzeTimePreferences(agentId, lookbackDate)
    for (const pattern of timePatterns) {
      const result = await upsertPattern(agentId, pattern)
      if (result.created) patternsCreated++
      else if (result.updated) patternsUpdated++
      if (result.pattern) patternsFound.push(result.pattern)
    }

    // 3. 에러 패턴 분석
    const errorPatterns = await analyzeErrorPatterns(agentId, lookbackDate)
    for (const pattern of errorPatterns) {
      const result = await upsertPattern(agentId, pattern)
      if (result.created) patternsCreated++
      else if (result.updated) patternsUpdated++
      if (result.pattern) patternsFound.push(result.pattern)
    }

    // 4. 관계 마일스톤 분석 (userId가 있는 경우)
    if (userId) {
      const relationshipPatterns = await analyzeRelationshipMilestones(agentId, userId)
      for (const pattern of relationshipPatterns) {
        const result = await upsertPattern(agentId, pattern)
        if (result.created) patternsCreated++
        else if (result.updated) patternsUpdated++
        if (result.pattern) patternsFound.push(result.pattern)
      }
    }

    return { patternsFound, patternsCreated, patternsUpdated }
  } catch (error) {
    console.error(`[PatternAnalyzer] Analysis failed for agent ${agentId}:`, error)
    throw error
  }
}

// ============================================================================
// Pattern Type Analyzers
// ============================================================================

/**
 * 반복 작업 패턴 분석
 * 예: "매주 월요일에 리포트 요청", "매일 아침 일정 확인"
 */
async function analyzeRecurringTasks(
  agentId: string,
  lookbackDate: string
): Promise<CreatePatternInput[]> {
  const supabase = createAdminClient()
  const patterns: CreatePatternInput[] = []

  try {
    // agent_work_logs에서 반복되는 작업 찾기
    const { data: logs } = await supabase
      .from('agent_work_logs')
      .select('log_type, title, created_at, tags')
      .eq('agent_id', agentId)
      .gte('created_at', lookbackDate)
      .order('created_at', { ascending: true })

    if (!logs || logs.length < 5) return patterns

    // 요일별, 시간대별 작업 빈도 분석
    const dayOfWeekCounts: Record<number, Record<string, number>> = {}
    const hourCounts: Record<number, Record<string, number>> = {}

    for (const log of logs) {
      const date = new Date(log.created_at)
      const dayOfWeek = date.getDay()
      const hour = date.getHours()
      const title = log.title?.toLowerCase() || ''

      // 요일별 카운트
      if (!dayOfWeekCounts[dayOfWeek]) dayOfWeekCounts[dayOfWeek] = {}
      dayOfWeekCounts[dayOfWeek][title] = (dayOfWeekCounts[dayOfWeek][title] || 0) + 1

      // 시간대별 카운트
      if (!hourCounts[hour]) hourCounts[hour] = {}
      hourCounts[hour][title] = (hourCounts[hour][title] || 0) + 1
    }

    // 반복 패턴 감지 (같은 요일에 3회 이상 동일 작업)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    for (const [dayStr, titles] of Object.entries(dayOfWeekCounts)) {
      const day = parseInt(dayStr)
      for (const [title, count] of Object.entries(titles)) {
        if (count >= 3 && title.length > 5) {
          patterns.push({
            agentId,
            patternType: 'recurring_task',
            patternName: `Weekly ${title} on ${dayNames[day]}`,
            patternNameKr: `매주 ${dayNames[day]}요일 ${title}`,
            patternDescription: `User typically requests "${title}" on ${dayNames[day]}s`,
            patternDescriptionKr: `사용자가 ${dayNames[day]}요일마다 "${title}" 작업을 요청함`,
            detectionRules: {
              trigger: 'time_based',
              schedule: `0 9 * * ${day}`, // 해당 요일 오전 9시
              conditions: [],
              cooldownMinutes: 60 * 24, // 하루에 한 번만
            },
            confidenceScore: Math.min(90, 50 + count * 10),
          })
        }
      }
    }

    return patterns
  } catch (error) {
    console.error('[PatternAnalyzer] Recurring task analysis failed:', error)
    return []
  }
}

/**
 * 시간 선호 패턴 분석
 * 예: "오전에 활동 집중", "주말엔 비활성"
 */
async function analyzeTimePreferences(
  agentId: string,
  lookbackDate: string
): Promise<CreatePatternInput[]> {
  const supabase = createAdminClient()
  const patterns: CreatePatternInput[] = []

  try {
    // 시간대별 상호작용 빈도 분석
    const { data: memories } = await supabase
      .from('agent_memories')
      .select('created_at, importance')
      .eq('agent_id', agentId)
      .gte('created_at', lookbackDate)

    if (!memories || memories.length < 10) return patterns

    // 시간대별 카운트
    const hourCounts: Record<number, { count: number; importance: number }> = {}

    for (const memory of memories) {
      const hour = new Date(memory.created_at).getHours()
      if (!hourCounts[hour]) hourCounts[hour] = { count: 0, importance: 0 }
      hourCounts[hour].count++
      hourCounts[hour].importance += memory.importance || 5
    }

    // 피크 시간대 찾기
    let peakHour = 9
    let peakCount = 0
    for (const [hourStr, data] of Object.entries(hourCounts)) {
      if (data.count > peakCount) {
        peakCount = data.count
        peakHour = parseInt(hourStr)
      }
    }

    // 피크 시간대가 뚜렷한 경우 패턴 생성
    const totalInteractions = memories.length
    const peakPercentage = (peakCount / totalInteractions) * 100

    if (peakPercentage > 15) {
      const periodName = peakHour < 12 ? 'morning' : peakHour < 17 ? 'afternoon' : 'evening'
      const periodNameKr = peakHour < 12 ? '오전' : peakHour < 17 ? '오후' : '저녁'

      patterns.push({
        agentId,
        patternType: 'time_preference',
        patternName: `Peak activity in ${periodName}`,
        patternNameKr: `${periodNameKr} 활동 집중`,
        patternDescription: `User is most active around ${peakHour}:00 (${peakPercentage.toFixed(1)}% of interactions)`,
        patternDescriptionKr: `사용자가 ${peakHour}시경에 가장 활발 (전체 상호작용의 ${peakPercentage.toFixed(1)}%)`,
        detectionRules: {
          trigger: 'time_based',
          schedule: `0 ${peakHour} * * *`,
          conditions: [],
          cooldownMinutes: 60 * 4, // 4시간에 한 번
        },
        confidenceScore: Math.min(85, 50 + Math.round(peakPercentage)),
      })
    }

    return patterns
  } catch (error) {
    console.error('[PatternAnalyzer] Time preference analysis failed:', error)
    return []
  }
}

/**
 * 에러 패턴 분석
 * 예: "특정 API가 자주 실패", "특정 시간대에 에러 집중"
 */
async function analyzeErrorPatterns(
  agentId: string,
  lookbackDate: string
): Promise<CreatePatternInput[]> {
  const supabase = createAdminClient()
  const patterns: CreatePatternInput[] = []

  try {
    // 실패한 워크플로우 분석
    const { data: failures } = await supabase
      .from('workflow_executions')
      .select('workflow_id, error, created_at')
      .eq('agent_id', agentId)
      .eq('status', 'failed')
      .gte('created_at', lookbackDate)

    if (!failures || failures.length < 3) return patterns

    // 워크플로우별 실패 횟수
    const workflowFailures: Record<string, { count: number; errors: string[] }> = {}

    for (const failure of failures) {
      const wfId = failure.workflow_id
      if (!workflowFailures[wfId]) workflowFailures[wfId] = { count: 0, errors: [] }
      workflowFailures[wfId].count++
      if (failure.error) workflowFailures[wfId].errors.push(failure.error)
    }

    // 3회 이상 실패한 워크플로우에 대해 패턴 생성
    for (const [workflowId, data] of Object.entries(workflowFailures)) {
      if (data.count >= 3) {
        patterns.push({
          agentId,
          patternType: 'error_pattern',
          patternName: `Recurring failures in workflow ${workflowId.slice(0, 8)}`,
          patternNameKr: `워크플로우 ${workflowId.slice(0, 8)} 반복 실패`,
          patternDescription: `Workflow has failed ${data.count} times. Common errors: ${data.errors.slice(0, 2).join(', ')}`,
          patternDescriptionKr: `워크플로우가 ${data.count}회 실패함. 주요 에러: ${data.errors.slice(0, 2).join(', ')}`,
          detectionRules: {
            trigger: 'threshold_based',
            threshold: {
              metric: 'workflow_failure_count',
              operator: 'gte',
              value: 3,
            },
            conditions: [
              { field: 'workflow_id', operator: 'eq', value: workflowId },
            ],
            cooldownMinutes: 60 * 24, // 하루에 한 번
          },
          confidenceScore: Math.min(90, 60 + data.count * 5),
        })
      }
    }

    return patterns
  } catch (error) {
    console.error('[PatternAnalyzer] Error pattern analysis failed:', error)
    return []
  }
}

/**
 * 관계 마일스톤 분석
 * 예: "100번째 대화", "첫 프로젝트 완료"
 */
async function analyzeRelationshipMilestones(
  agentId: string,
  userId: string
): Promise<CreatePatternInput[]> {
  const supabase = createAdminClient()
  const patterns: CreatePatternInput[] = []

  try {
    // 관계 정보 가져오기
    const { data: relationship } = await supabase
      .from('agent_relationships')
      .select('interaction_count, rapport, trust, milestones')
      .eq('agent_id', agentId)
      .eq('partner_user_id', userId)
      .single()

    if (!relationship) return patterns

    const interactionCount = relationship.interaction_count || 0
    const existingMilestones = (relationship.milestones as any[]) || []

    // 마일스톤 체크 (10, 50, 100, 500, 1000)
    const milestones = [10, 50, 100, 500, 1000]

    for (const milestone of milestones) {
      // 다음 마일스톤까지 90% 도달했고, 아직 기록되지 않은 경우
      if (
        interactionCount >= milestone * 0.9 &&
        interactionCount < milestone &&
        !existingMilestones.some((m: any) => m.type === `interactions_${milestone}`)
      ) {
        patterns.push({
          agentId,
          patternType: 'relationship_milestone',
          patternName: `Approaching ${milestone} interactions`,
          patternNameKr: `${milestone}회 대화 임박`,
          patternDescription: `User is approaching ${milestone} total interactions (currently ${interactionCount})`,
          patternDescriptionKr: `사용자와 ${milestone}회 대화에 가까워짐 (현재 ${interactionCount}회)`,
          detectionRules: {
            trigger: 'threshold_based',
            threshold: {
              metric: 'interaction_count',
              operator: 'gte',
              value: milestone,
            },
            conditions: [
              { field: 'user_id', operator: 'eq', value: userId },
            ],
            cooldownMinutes: 60 * 24 * 7, // 일주일에 한 번
          },
          confidenceScore: 95,
        })
      }
    }

    return patterns
  } catch (error) {
    console.error('[PatternAnalyzer] Relationship milestone analysis failed:', error)
    return []
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

interface UpsertResult {
  pattern: ProactivePattern | null
  created: boolean
  updated: boolean
}

/**
 * 패턴 생성 또는 업데이트
 */
async function upsertPattern(
  agentId: string,
  input: CreatePatternInput
): Promise<UpsertResult> {
  const supabase = createAdminClient()

  try {
    // 동일한 패턴이 있는지 확인
    const { data: existing } = await supabase
      .from('proactive_patterns')
      .select('*')
      .eq('agent_id', agentId)
      .eq('pattern_name', input.patternName)
      .eq('is_active', true)
      .single()

    if (existing) {
      // 기존 패턴 업데이트 (confidence 증가)
      const newConfidence = Math.min(95, (existing.confidence_score || 50) + 5)
      const { data: updated } = await supabase
        .from('proactive_patterns')
        .update({
          confidence_score: newConfidence,
          occurrence_count: (existing.occurrence_count || 0) + 1,
          detection_rules: input.detectionRules,
        })
        .eq('id', existing.id)
        .select()
        .single()

      return { pattern: updated as any, created: false, updated: true }
    } else {
      // 새 패턴 생성
      const { data: created } = await supabase
        .from('proactive_patterns')
        .insert({
          agent_id: agentId,
          pattern_type: input.patternType,
          pattern_name: input.patternName,
          pattern_name_kr: input.patternNameKr,
          pattern_description: input.patternDescription,
          pattern_description_kr: input.patternDescriptionKr,
          detection_rules: input.detectionRules,
          confidence_score: input.confidenceScore || 50,
        })
        .select()
        .single()

      return { pattern: created as any, created: true, updated: false }
    }
  } catch (error) {
    console.error('[PatternAnalyzer] Upsert pattern failed:', error)
    return { pattern: null, created: false, updated: false }
  }
}

/**
 * 특정 에이전트의 활성 패턴 조회
 */
export async function getActivePatterns(agentId: string): Promise<ProactivePattern[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('proactive_patterns')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .order('confidence_score', { ascending: false })

  if (error) throw error
  return (data as any[]) || []
}

/**
 * 메모리 저장 시 호출되는 학습 트리거
 */
export async function onMemorySaved(agentId: string, memoryId: string): Promise<void> {
  // 메모리 저장 시 실시간 패턴 분석은 무거우므로
  // 대신 하트비트에서 배치로 처리
  console.log(`[PatternAnalyzer] Memory saved: ${memoryId} for agent ${agentId}`)
}

/**
 * 학습 생성 시 호출되는 트리거
 */
export async function onLearningCreated(agentId: string, learningId: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    // 학습 내용 조회
    const { data: learning } = await supabase
      .from('agent_learnings')
      .select('*')
      .eq('id', learningId)
      .single()

    if (!learning) return

    // 학습 카테고리에 따른 패턴 생성 가능성 체크
    if (learning.category === 'preference' && learning.confidence >= 70) {
      // 선호도 관련 학습 → user_behavior 패턴 후보
      console.log(`[PatternAnalyzer] High-confidence preference learning detected: ${learning.insight}`)
    }
  } catch (error) {
    console.error('[PatternAnalyzer] Learning trigger failed:', error)
  }
}
