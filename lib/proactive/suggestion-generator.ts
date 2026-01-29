/**
 * Proactive Engine - Suggestion Generator
 *
 * 패턴과 컨텍스트에서 능동적 제안 생성
 * - 패턴 기반 제안
 * - 컨텍스트 기반 제안
 * - 관계 기반 제안
 */

import { createAdminClient } from '@/lib/supabase/server'
import type {
  ProactiveSuggestion,
  ProactivePattern,
  SuggestionType,
  SuggestionPriority,
  CreateSuggestionInput,
  SuggestedAction,
} from './types'

// ============================================================================
// Types
// ============================================================================

interface GenerationContext {
  agentId: string
  userId?: string
  trigger?: string
  additionalContext?: Record<string, unknown>
}

interface GenerationResult {
  suggestions: ProactiveSuggestion[]
  created: number
}

// ============================================================================
// Suggestion Generator Service
// ============================================================================

/**
 * 패턴에서 제안 생성
 */
export async function generateFromPattern(
  pattern: ProactivePattern,
  context: GenerationContext
): Promise<ProactiveSuggestion | null> {
  const supabase = createAdminClient()

  try {
    // 패턴 타입에 따른 제안 타입 매핑
    const suggestionType = mapPatternToSuggestionType(pattern.patternType)
    const priority = calculatePriority(pattern.confidenceScore)

    // 제안 메시지 생성
    const { title, titleKr, message, messageKr } = generateSuggestionContent(pattern)

    // 액션 생성
    const suggestedAction = generateSuggestedAction(pattern)

    // 제안 저장
    const { data, error } = await supabase
      .from('proactive_suggestions' as any)
      .insert({
        agent_id: context.agentId,
        user_id: context.userId,
        suggestion_type: suggestionType,
        title,
        title_kr: titleKr,
        message,
        message_kr: messageKr,
        source_pattern_id: pattern.id,
        priority,
        confidence_score: pattern.confidenceScore,
        suggested_action: suggestedAction,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        context: context.additionalContext || {},
      } as any)
      .select()
      .single()

    if (error) throw error

    return data as any
  } catch (error) {
    console.error(`[SuggestionGenerator] Failed to generate from pattern ${pattern.id}:`, error)
    return null
  }
}

/**
 * 컨텍스트 기반 제안 생성 (Reverse Prompting)
 */
export async function generateReversePrompt(
  context: GenerationContext
): Promise<ProactiveSuggestion | null> {
  const supabase = createAdminClient()

  try {
    // 에이전트의 학습 내용 조회
    const { data: learnings } = await supabase
      .from('agent_learnings' as any)
      .select('category, subject, insight, confidence')
      .eq('agent_id', context.agentId)
      .gte('confidence', 70)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!learnings || learnings.length === 0) return null

    // 사용자 관계 정보 조회
    let relationshipContext = ''
    if (context.userId) {
      const { data: relationship } = await supabase
        .from('agent_relationships' as any)
        .select('rapport, trust, interaction_count, communication_style')
        .eq('agent_id', context.agentId)
        .eq('partner_user_id', context.userId)
        .single()

      if (relationship) {
        const rel = relationship as any
        relationshipContext = `Rapport: ${rel.rapport}, Trust: ${rel.trust}, Interactions: ${rel.interaction_count}`
      }
    }

    // 최근 작업 패턴 기반 제안 생성
    const topLearning = (learnings as any[])[0]

    const { data, error } = await supabase
      .from('proactive_suggestions' as any)
      .insert({
        agent_id: context.agentId,
        user_id: context.userId,
        suggestion_type: 'proactive_offer',
        title: `Suggestion based on your ${topLearning.category}`,
        title_kr: `${getCategoryKr(topLearning.category)} 기반 제안`,
        message: `Based on what I've learned about you: "${topLearning.insight}". Would you like me to help with something related?`,
        message_kr: `제가 배운 내용에 따르면: "${topLearning.insight}". 관련해서 도와드릴까요?`,
        source_learning_ids: [(learnings as any[])[0].id],
        priority: 'medium',
        confidence_score: topLearning.confidence,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        context: {
          trigger: 'reverse_prompt',
          relationshipContext,
          learningCategory: topLearning.category,
        },
      } as any)
      .select()
      .single()

    if (error) throw error

    return data as any
  } catch (error) {
    console.error('[SuggestionGenerator] Failed to generate reverse prompt:', error)
    return null
  }
}

/**
 * 관계 기반 제안 생성 (오래 대화 없을 때)
 */
export async function generateRelationshipNudge(
  context: GenerationContext
): Promise<ProactiveSuggestion | null> {
  const supabase = createAdminClient()

  if (!context.userId) return null

  try {
    // 마지막 상호작용 시간 확인
    const { data: relationship } = await supabase
      .from('agent_relationships' as any)
      .select('last_interaction_at, interaction_count, rapport')
      .eq('agent_id', context.agentId)
      .eq('partner_user_id', context.userId)
      .single()

    if (!relationship) return null
    const rel = relationship as any
    if (!rel.last_interaction_at) return null

    const lastInteraction = new Date(rel.last_interaction_at)
    const daysSinceInteraction = Math.floor(
      (Date.now() - lastInteraction.getTime()) / (24 * 60 * 60 * 1000)
    )

    // 5일 이상 대화 없으면 넛지 생성
    if (daysSinceInteraction < 5) return null

    const { data, error } = await supabase
      .from('proactive_suggestions' as any)
      .insert({
        agent_id: context.agentId,
        user_id: context.userId,
        suggestion_type: 'relationship_nudge',
        title: `It's been ${daysSinceInteraction} days`,
        title_kr: `${daysSinceInteraction}일 만이에요`,
        message: `We haven't chatted in a while. Is there anything I can help you with?`,
        message_kr: `오랜만이네요. 도와드릴 일이 있으신가요?`,
        priority: 'low',
        confidence_score: 80,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        context: {
          daysSinceInteraction,
          totalInteractions: rel.interaction_count,
          rapport: rel.rapport,
        },
      } as any)
      .select()
      .single()

    if (error) throw error

    return data as any
  } catch (error) {
    console.error('[SuggestionGenerator] Failed to generate relationship nudge:', error)
    return null
  }
}

/**
 * 에러 알림 제안 생성
 */
export async function generateErrorAlert(
  context: GenerationContext & {
    errorType: string
    errorMessage: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }
): Promise<ProactiveSuggestion | null> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('proactive_suggestions' as any)
      .insert({
        agent_id: context.agentId,
        user_id: context.userId,
        suggestion_type: 'error_alert',
        title: `Error detected: ${context.errorType}`,
        title_kr: `에러 감지: ${context.errorType}`,
        message: context.errorMessage,
        message_kr: context.errorMessage,
        priority: context.severity === 'critical' ? 'urgent' : context.severity,
        confidence_score: 100,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        context: {
          errorType: context.errorType,
          severity: context.severity,
        },
      } as any)
      .select()
      .single()

    if (error) throw error

    return data as any
  } catch (error) {
    console.error('[SuggestionGenerator] Failed to generate error alert:', error)
    return null
  }
}

/**
 * 스킬 추천 제안 생성
 */
export async function generateSkillSuggestion(
  context: GenerationContext & {
    skillName: string
    reason: string
  }
): Promise<ProactiveSuggestion | null> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('proactive_suggestions' as any)
      .insert({
        agent_id: context.agentId,
        user_id: context.userId,
        suggestion_type: 'skill_suggestion',
        title: `Try using: ${context.skillName}`,
        title_kr: `이 도구를 사용해보세요: ${context.skillName}`,
        message: context.reason,
        message_kr: context.reason,
        priority: 'low',
        confidence_score: 70,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        suggested_action: {
          type: 'custom',
          params: { skillName: context.skillName },
          label: `Learn about ${context.skillName}`,
          labelKr: `${context.skillName} 알아보기`,
        },
        context: {
          skillName: context.skillName,
          reason: context.reason,
        },
      } as any)
      .select()
      .single()

    if (error) throw error

    return data as any
  } catch (error) {
    console.error('[SuggestionGenerator] Failed to generate skill suggestion:', error)
    return null
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapPatternToSuggestionType(patternType: string): SuggestionType {
  const mapping: Record<string, SuggestionType> = {
    recurring_task: 'task_reminder',
    time_preference: 'proactive_offer',
    user_behavior: 'proactive_offer',
    error_pattern: 'error_alert',
    relationship_milestone: 'relationship_nudge',
    skill_gap: 'skill_suggestion',
  }
  return mapping[patternType] || 'proactive_offer'
}

function calculatePriority(confidenceScore: number): SuggestionPriority {
  if (confidenceScore >= 90) return 'high'
  if (confidenceScore >= 70) return 'medium'
  return 'low'
}

function generateSuggestionContent(pattern: ProactivePattern): {
  title: string
  titleKr: string
  message: string
  messageKr: string
} {
  // 패턴 정보를 기반으로 제안 내용 생성
  return {
    title: pattern.patternName,
    titleKr: pattern.patternNameKr,
    message: pattern.patternDescription || `Detected pattern: ${pattern.patternName}`,
    messageKr: pattern.patternDescriptionKr || `패턴 감지됨: ${pattern.patternNameKr}`,
  }
}

function generateSuggestedAction(pattern: ProactivePattern): SuggestedAction | null {
  switch (pattern.patternType) {
    case 'recurring_task':
      return {
        type: 'create_task',
        params: { patternId: pattern.id },
        label: 'Create task now',
        labelKr: '지금 태스크 생성',
      }
    case 'error_pattern':
      return {
        type: 'run_workflow',
        params: { action: 'diagnose', patternId: pattern.id },
        label: 'Run diagnosis',
        labelKr: '진단 실행',
      }
    case 'relationship_milestone':
      return {
        type: 'send_message',
        params: { type: 'celebration' },
        label: 'Celebrate milestone',
        labelKr: '마일스톤 축하',
      }
    default:
      return null
  }
}

function getCategoryKr(category: string): string {
  const mapping: Record<string, string> = {
    person: '사람',
    project: '프로젝트',
    domain: '도메인',
    workflow: '워크플로우',
    preference: '선호도',
    decision_rule: '결정 규칙',
    lesson: '교훈',
  }
  return mapping[category] || category
}

// ============================================================================
// Batch Generation
// ============================================================================

/**
 * 에이전트에 대해 배치로 제안 생성
 */
export async function generateBatchSuggestions(
  context: GenerationContext
): Promise<GenerationResult> {
  const suggestions: ProactiveSuggestion[] = []
  let created = 0

  try {
    // 1. Reverse prompt (주기적)
    const reversePrompt = await generateReversePrompt(context)
    if (reversePrompt) {
      suggestions.push(reversePrompt)
      created++
    }

    // 2. Relationship nudge (사용자가 있는 경우)
    if (context.userId) {
      const nudge = await generateRelationshipNudge(context)
      if (nudge) {
        suggestions.push(nudge)
        created++
      }
    }

    return { suggestions, created }
  } catch (error) {
    console.error('[SuggestionGenerator] Batch generation failed:', error)
    return { suggestions: [], created: 0 }
  }
}
