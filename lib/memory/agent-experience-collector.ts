/**
 * Agent Experience Collector v2.0
 *
 * PRD v2.0 Phase 4.2: 경험 수집 엔진
 * - 대화/회의/작업에서 학습 가능한 경험 추출
 * - 패턴 인식 및 인사이트 생성
 * - LLM 기반 경험 분석
 * - agent_learnings 테이블에 저장
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { ChatOpenAI } from '@langchain/openai'
import { saveAgentMemory, AgentMemoryType } from './agent-memory-service'
import { increaseStat, increaseExpertise, addExperience } from './agent-stats-service'

// ============================================
// Types
// ============================================

export type LearningCategory =
  | 'person'        // 특정 사람에 대한 학습
  | 'project'       // 프로젝트 관련 학습
  | 'domain'        // 도메인 지식
  | 'workflow'      // 업무 패턴
  | 'preference'    // 선호도
  | 'decision_rule' // 의사결정 규칙
  | 'lesson'        // 경험에서 배운 교훈

export interface AgentLearning {
  id: string
  agent_id: string
  category: LearningCategory
  subject: string
  subject_id?: string | null
  insight: string
  confidence: number  // 0-100
  evidence_count: number
  source_memory_ids: string[]
  source_workflow_run_ids: string[]
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ExperienceEvent {
  type: 'conversation' | 'meeting' | 'task' | 'workflow' | 'feedback'
  agentId: string
  relationshipId?: string | null
  meetingId?: string | null
  // 대화 내용
  messages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  // 메타데이터
  success?: boolean
  duration?: number
  topicDomain?: string
  participants?: string[]
  outcome?: string
}

export interface ExtractedInsight {
  category: LearningCategory
  subject: string
  insight: string
  confidence: number
  tags: string[]
}

export interface ExperienceAnalysis {
  insights: ExtractedInsight[]
  domains: string[]
  statGrowth: {
    analysis?: number
    communication?: number
    creativity?: number
    leadership?: number
  }
  experiencePoints: number
  memoryImportance: number
}

// ============================================
// Experience Collection
// ============================================

/**
 * 경험 이벤트 수집 및 분석
 */
export async function collectExperience(
  event: ExperienceEvent
): Promise<ExperienceAnalysis> {
  const analysis: ExperienceAnalysis = {
    insights: [],
    domains: [],
    statGrowth: {},
    experiencePoints: 0,
    memoryImportance: 5,
  }

  try {
    // 1. 이벤트 타입별 기본 경험치
    analysis.experiencePoints = getBaseExperience(event.type, event.success)

    // 2. LLM 기반 인사이트 추출
    if (event.messages && event.messages.length > 0) {
      const insights = await extractInsightsFromConversation(
        event.agentId,
        event.messages,
        event.type
      )
      analysis.insights = insights

      // 도메인 추출
      analysis.domains = Array.from(new Set(insights.map(i => i.tags).flat()))
    }

    // 3. 능력치 성장 계산
    analysis.statGrowth = calculateStatGrowth(event)

    // 4. 메모리 중요도 계산
    analysis.memoryImportance = calculateMemoryImportance(event, analysis.insights)

    // 5. 학습 저장
    await saveInsights(event.agentId, analysis.insights, event)

    // 6. 능력치 적용
    await applyStatGrowth(event.agentId, analysis.statGrowth, event.type)

    // 7. 경험치 추가
    if (analysis.experiencePoints > 0) {
      await addExperience(event.agentId, analysis.experiencePoints, event.type)
    }

    // 8. 도메인 전문성 증가
    for (const domain of analysis.domains) {
      await increaseExpertise(event.agentId, domain, 1, `${event.type} 중 언급`)
    }

    return analysis
  } catch (error) {
    console.error('[ExperienceCollector] Error:', error)
    return analysis
  }
}

/**
 * 기본 경험치 계산
 */
function getBaseExperience(type: ExperienceEvent['type'], success?: boolean): number {
  const base = {
    conversation: 2,
    meeting: 10,
    task: 5,
    workflow: 15,
    feedback: 10,
  }[type]

  // 성공/실패 보정
  if (success === true) return base * 1.5
  if (success === false) return Math.ceil(base * 0.3)  // 실패해도 약간의 경험치

  return base
}

/**
 * LLM을 사용하여 대화에서 인사이트 추출
 */
async function extractInsightsFromConversation(
  agentId: string,
  messages: Array<{ role: string; content: string }>,
  eventType: string
): Promise<ExtractedInsight[]> {
  try {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    // 대화가 너무 짧으면 스킵
    if (conversationText.length < 100) {
      return []
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 1000,
    })

    const prompt = `다음 대화를 분석하여 학습할 수 있는 인사이트를 추출해주세요.

### 대화 내용
${conversationText}

### 추출할 인사이트 카테고리
- person: 특정 사람의 성향, 선호도, 스타일
- project: 프로젝트 관련 정보, 요구사항, 진행상황
- domain: 특정 도메인/분야의 지식
- workflow: 업무 패턴, 프로세스
- preference: 선호도, 취향
- decision_rule: 의사결정 규칙, 기준
- lesson: 배운 교훈, 주의사항

### 응답 형식 (JSON 배열)
[
  {
    "category": "person",
    "subject": "대상 이름 또는 주제",
    "insight": "구체적인 인사이트 (1-2문장)",
    "confidence": 70,
    "tags": ["관련 태그1", "관련 태그2"]
  }
]

### 주의사항
- 의미있는 인사이트만 추출 (최대 3개)
- confidence는 50-100 사이
- 추측이 아닌 대화에서 명확히 드러난 것만
- 인사이트가 없으면 빈 배열 []

응답:`

    const response = await llm.invoke(prompt)
    const content = (response.content as string).trim()

    // JSON 파싱
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ExtractedInsight[]
      }
    } catch {
      console.warn('[ExperienceCollector] JSON parse failed')
    }

    return []
  } catch (error) {
    console.error('[ExperienceCollector] Insight extraction failed:', error)
    return []
  }
}

/**
 * 능력치 성장 계산
 */
function calculateStatGrowth(
  event: ExperienceEvent
): ExperienceAnalysis['statGrowth'] {
  const growth: ExperienceAnalysis['statGrowth'] = {}

  switch (event.type) {
    case 'conversation':
      // 소통력 기본 증가
      if (Math.random() < 0.15) {
        growth.communication = 1
      }
      break

    case 'meeting':
      // 소통력 확실히 증가
      growth.communication = 2

      // 참가자 많으면 리더십도
      if ((event.participants?.length || 0) >= 3) {
        growth.leadership = 1
      }
      break

    case 'task':
      // 분석력 증가
      if (event.success) {
        growth.analysis = 1
      }
      break

    case 'workflow':
      // 성공시 창의성 증가
      if (event.success) {
        growth.creativity = 2
        growth.analysis = 1
      }
      break

    case 'feedback':
      // 피드백에서 학습
      if (event.success) {
        growth.communication = 1
      }
      break
  }

  return growth
}

/**
 * 메모리 중요도 계산
 */
function calculateMemoryImportance(
  event: ExperienceEvent,
  insights: ExtractedInsight[]
): number {
  let importance = 5  // 기본값

  // 인사이트 많으면 중요
  importance += Math.min(insights.length, 3)

  // 이벤트 타입별 가중치
  const typeWeights = {
    conversation: 0,
    meeting: 1,
    task: 1,
    workflow: 2,
    feedback: 1,
  }
  importance += typeWeights[event.type]

  // 성공한 작업은 더 중요
  if (event.success === true) importance += 1

  return Math.min(10, importance)
}

/**
 * 인사이트 저장
 */
async function saveInsights(
  agentId: string,
  insights: ExtractedInsight[],
  event: ExperienceEvent
): Promise<void> {
  if (insights.length === 0) return

  const supabase = createAdminClient()

  for (const insight of insights) {
    try {
      // 기존에 유사한 인사이트가 있는지 확인
      const { data: existing } = await (supabase as any)
        .from('agent_learnings')
        .select('id, confidence, evidence_count')
        .eq('agent_id', agentId)
        .eq('category', insight.category)
        .eq('subject', insight.subject)
        .single()

      if (existing) {
        // 기존 인사이트 강화
        await (supabase as any)
          .from('agent_learnings')
          .update({
            confidence: Math.min(100, existing.confidence + 5),
            evidence_count: existing.evidence_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        // 새 인사이트 저장
        await (supabase as any)
          .from('agent_learnings')
          .insert({
            agent_id: agentId,
            category: insight.category,
            subject: insight.subject,
            insight: insight.insight,
            confidence: insight.confidence,
            evidence_count: 1,
            source_memory_ids: [],
            source_workflow_run_ids: event.type === 'workflow' ? [] : [],
            tags: insight.tags,
            metadata: {
              event_type: event.type,
              extracted_at: new Date().toISOString(),
            },
          })
      }
    } catch (error) {
      console.error('[ExperienceCollector] Save insight failed:', error)
    }
  }
}

/**
 * 능력치 성장 적용
 */
async function applyStatGrowth(
  agentId: string,
  growth: ExperienceAnalysis['statGrowth'],
  eventType: string
): Promise<void> {
  const stats = Object.entries(growth) as Array<[keyof typeof growth, number]>

  for (const [stat, amount] of stats) {
    if (amount && amount > 0) {
      await increaseStat(agentId, stat as any, amount, {
        type: eventType as any,
        description: `${eventType} 완료`,
      })
    }
  }
}

// ============================================
// Learning Query Functions
// ============================================

/**
 * 에이전트의 학습 인사이트 조회
 */
export async function getAgentLearnings(
  agentId: string,
  options?: {
    category?: LearningCategory
    subject?: string
    minConfidence?: number
    limit?: number
  }
): Promise<AgentLearning[]> {
  try {
    const supabase = createAdminClient()

    let query = (supabase as any)
      .from('agent_learnings')
      .select('*')
      .eq('agent_id', agentId)
      .order('confidence', { ascending: false })

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    if (options?.subject) {
      query = query.ilike('subject', `%${options.subject}%`)
    }

    if (options?.minConfidence) {
      query = query.gte('confidence', options.minConfidence)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[ExperienceCollector] Query failed:', error)
      return []
    }

    return (data || []) as AgentLearning[]
  } catch (error) {
    console.error('[ExperienceCollector] Error:', error)
    return []
  }
}

/**
 * 특정 사람에 대한 학습 조회
 */
export async function getPersonLearnings(
  agentId: string,
  personName: string
): Promise<AgentLearning[]> {
  return getAgentLearnings(agentId, {
    category: 'person',
    subject: personName,
  })
}

/**
 * 도메인 전문성 관련 학습 조회
 */
export async function getDomainLearnings(
  agentId: string,
  domain: string
): Promise<AgentLearning[]> {
  const supabase = createAdminClient()

  const { data } = await (supabase as any)
    .from('agent_learnings')
    .select('*')
    .eq('agent_id', agentId)
    .contains('tags', [domain])
    .order('confidence', { ascending: false })
    .limit(20)

  return (data || []) as AgentLearning[]
}

/**
 * 학습 인사이트를 프롬프트 컨텍스트로 변환
 */
export function formatLearningsForPrompt(
  learnings: AgentLearning[],
  maxItems: number = 5
): string {
  if (learnings.length === 0) return ''

  const topLearnings = learnings.slice(0, maxItems)

  let context = '### 학습된 인사이트\n'

  for (const learning of topLearnings) {
    const confidenceLabel = learning.confidence >= 80 ? '높음' :
                           learning.confidence >= 60 ? '중간' : '낮음'
    context += `- [${learning.category}] ${learning.subject}: ${learning.insight} (신뢰도: ${confidenceLabel})\n`
  }

  return context.trim()
}

/**
 * 학습 통계 조회
 */
export async function getLearningStats(agentId: string): Promise<{
  totalLearnings: number
  byCategory: Record<LearningCategory, number>
  avgConfidence: number
  topSubjects: Array<{ subject: string; count: number }>
}> {
  try {
    const supabase = createAdminClient()

    const { data: learnings } = await (supabase as any)
      .from('agent_learnings')
      .select('category, subject, confidence')
      .eq('agent_id', agentId)

    if (!learnings || learnings.length === 0) {
      return {
        totalLearnings: 0,
        byCategory: {} as Record<LearningCategory, number>,
        avgConfidence: 0,
        topSubjects: [],
      }
    }

    // 카테고리별 카운트
    const byCategory = (learnings as any[]).reduce((acc: Record<string, number>, l: any) => {
      acc[l.category] = (acc[l.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 평균 신뢰도
    const avgConfidence = Math.round(
      (learnings as any[]).reduce((sum: number, l: any) => sum + l.confidence, 0) / learnings.length
    )

    // 상위 주제
    const subjectCounts = (learnings as any[]).reduce((acc: Record<string, number>, l: any) => {
      acc[l.subject] = (acc[l.subject] || 0) + 1
      return acc
    }, {})

    const topSubjects = Object.entries(subjectCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([subject, count]) => ({ subject, count: count as number }))

    return {
      totalLearnings: learnings.length,
      byCategory: byCategory as Record<LearningCategory, number>,
      avgConfidence,
      topSubjects,
    }
  } catch (error) {
    console.error('[ExperienceCollector] Stats failed:', error)
    return {
      totalLearnings: 0,
      byCategory: {} as Record<LearningCategory, number>,
      avgConfidence: 0,
      topSubjects: [],
    }
  }
}

// ============================================
// Export
// ============================================

export default {
  collectExperience,
  getAgentLearnings,
  getPersonLearnings,
  getDomainLearnings,
  formatLearningsForPrompt,
  getLearningStats,
}
