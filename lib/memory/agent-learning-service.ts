/**
 * Agent Learning Service
 *
 * Layer 3: Learned Insights
 * - 메모리에서 패턴 및 인사이트 추출
 * - 학습 데이터 관리
 * - 신뢰도 기반 필터링
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { ChatOpenAI } from '@langchain/openai'

// ============================================
// Types
// ============================================

export type LearningCategory =
  | 'person'         // 특정 사람에 대한 학습
  | 'project'        // 프로젝트 관련 학습
  | 'domain'         // 도메인 지식
  | 'workflow'       // 업무 패턴
  | 'preference'     // 선호도
  | 'decision_rule'  // 의사결정 규칙
  | 'lesson'         // 경험에서 배운 교훈

export interface AgentLearning {
  id: string
  agent_id: string
  category: LearningCategory
  subject: string
  subject_id?: string | null
  insight: string
  confidence: number
  evidence_count: number
  source_memory_ids: string[]
  source_workflow_run_ids: string[]
  tags: string[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface SaveLearningParams {
  agentId: string
  category: LearningCategory
  subject: string
  subjectId?: string | null
  insight: string
  confidence?: number
  sourceMemoryIds?: string[]
  sourceWorkflowRunIds?: string[]
  tags?: string[]
  metadata?: Record<string, any>
}

export interface ExtractedLearning {
  category: LearningCategory
  subject: string
  insight: string
  confidence: number
}

// ============================================
// LLM Setup
// ============================================

function getModel() {
  return new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    openAIApiKey: process.env.OPENAI_API_KEY,
  })
}

// ============================================
// Learning CRUD
// ============================================

/**
 * 학습 저장
 */
export async function saveLearning(
  params: SaveLearningParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 기존 학습이 있는지 확인 (같은 주제)
    const { data: existing } = await (supabase as any)
      .from('agent_learnings')
      .select('id, confidence, evidence_count, source_memory_ids')
      .eq('agent_id', params.agentId)
      .eq('category', params.category)
      .eq('subject', params.subject)
      .single()

    if (existing) {
      // 기존 학습 업데이트 (신뢰도 증가)
      const newConfidence = Math.min(100, existing.confidence + 5)
      const newEvidenceCount = existing.evidence_count + 1
      const newSourceMemoryIds = Array.from(new Set([
        ...(existing.source_memory_ids || []),
        ...(params.sourceMemoryIds || []),
      ]))

      const { error } = await (supabase as any)
        .from('agent_learnings')
        .update({
          insight: params.insight,  // 최신 인사이트로 업데이트
          confidence: newConfidence,
          evidence_count: newEvidenceCount,
          source_memory_ids: newSourceMemoryIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, id: existing.id }
    }

    // 새 학습 생성
    const { data, error } = await (supabase as any)
      .from('agent_learnings')
      .insert({
        agent_id: params.agentId,
        category: params.category,
        subject: params.subject,
        subject_id: params.subjectId || null,
        insight: params.insight,
        confidence: params.confidence ?? 50,
        evidence_count: 1,
        source_memory_ids: params.sourceMemoryIds || [],
        source_workflow_run_ids: params.sourceWorkflowRunIds || [],
        tags: params.tags || [],
        metadata: params.metadata || {},
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Learning] Save failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 학습 조회
 */
export async function getLearnings(params: {
  agentId: string
  category?: LearningCategory
  subject?: string
  minConfidence?: number
  limit?: number
}): Promise<AgentLearning[]> {
  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('agent_learnings')
      .select('*')
      .eq('agent_id', params.agentId)
      .order('confidence', { ascending: false })

    if (params.category) {
      query = query.eq('category', params.category)
    }

    if (params.subject) {
      query = query.ilike('subject', `%${params.subject}%`)
    }

    if (params.minConfidence) {
      query = query.gte('confidence', params.minConfidence)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Learning] Get failed:', error)
      return []
    }

    return (data || []) as AgentLearning[]
  } catch (error) {
    console.error('[Learning] Error:', error)
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
  return getLearnings({
    agentId,
    category: 'person',
    subject: personName,
    minConfidence: 30,
  })
}

// ============================================
// Learning Extraction
// ============================================

/**
 * 메모리에서 학습 추출
 */
export async function extractLearningsFromMemories(
  agentId: string,
  memoryIds: string[]
): Promise<ExtractedLearning[]> {
  try {
    const supabase = createAdminClient()

    // 메모리 조회
    const { data: memories } = await (supabase as any)
      .from('agent_memories')
      .select('id, raw_content, summary, metadata')
      .in('id', memoryIds)

    if (!memories || memories.length === 0) {
      return []
    }

    const model = getModel()

    const memoryContents = memories
      .map((m: any) => m.summary || m.raw_content.substring(0, 500))
      .join('\n---\n')

    const prompt = `다음 대화/이벤트 내용에서 학습할 수 있는 인사이트를 추출하세요:

"""
${memoryContents}
"""

다음 JSON 형식으로 응답하세요:
{
  "learnings": [
    {
      "category": "person|project|domain|workflow|preference|decision_rule|lesson 중 택1",
      "subject": "학습 대상 (예: 사람 이름, 프로젝트명, 도메인명)",
      "insight": "학습 내용 (1문장)",
      "confidence": 30-80 (확신도)
    }
  ]
}

카테고리 설명:
- person: 특정 사람의 성향, 선호, 특징
- project: 프로젝트 관련 정보
- domain: 도메인/분야 지식
- workflow: 업무 패턴, 프로세스
- preference: 일반적 선호도
- decision_rule: 의사결정 기준
- lesson: 경험에서 배운 교훈

규칙:
- 확실한 인사이트만 추출
- 추측하지 말고 대화 내용 기반으로만
- 최대 5개까지

JSON만 반환하세요.`

    const response = await model.invoke(prompt)
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return (parsed.learnings || []) as ExtractedLearning[]
    }

    return []
  } catch (error) {
    console.error('[Learning] Extraction failed:', error)
    return []
  }
}

/**
 * 추출된 학습 저장 (배치)
 */
export async function saveExtractedLearnings(
  agentId: string,
  learnings: ExtractedLearning[],
  sourceMemoryIds: string[]
): Promise<{ saved: number; failed: number }> {
  const result = { saved: 0, failed: 0 }

  for (const learning of learnings) {
    const saveResult = await saveLearning({
      agentId,
      category: learning.category,
      subject: learning.subject,
      insight: learning.insight,
      confidence: learning.confidence,
      sourceMemoryIds,
    })

    if (saveResult.success) {
      result.saved++
    } else {
      result.failed++
    }
  }

  return result
}

/**
 * 대화에서 자동 학습 추출 및 저장
 */
export async function learnFromConversation(
  agentId: string,
  memoryIds: string[]
): Promise<{ learnings: ExtractedLearning[]; saved: number }> {
  // 학습 추출
  const learnings = await extractLearningsFromMemories(agentId, memoryIds)

  if (learnings.length === 0) {
    return { learnings: [], saved: 0 }
  }

  // 저장
  const { saved } = await saveExtractedLearnings(agentId, learnings, memoryIds)

  return { learnings, saved }
}

/**
 * 사람에 대한 인사이트 생성
 */
export async function generatePersonInsight(
  agentId: string,
  personName: string,
  userId?: string
): Promise<string | null> {
  try {
    // 해당 사람 관련 학습 조회
    const learnings = await getLearnings({
      agentId,
      category: 'person',
      subject: personName,
      minConfidence: 40,
      limit: 10,
    })

    if (learnings.length === 0) {
      return null
    }

    // 인사이트 종합
    const insights = learnings.map(l => l.insight).join('\n- ')

    const model = getModel()

    const prompt = `다음은 "${personName}"에 대해 학습한 내용입니다:

- ${insights}

위 내용을 바탕으로 이 사람과 대화할 때 참고할 수 있는 종합 인사이트를 2-3문장으로 작성하세요.`

    const response = await model.invoke(prompt)
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    return content.trim()
  } catch (error) {
    console.error('[Learning] Person insight failed:', error)
    return null
  }
}

/**
 * 학습 기반 컨텍스트 생성 (프롬프트용)
 */
export async function buildLearningContext(
  agentId: string,
  relevantSubjects?: string[]
): Promise<string> {
  try {
    // 신뢰도 높은 학습 조회
    const allLearnings = await getLearnings({
      agentId,
      minConfidence: 60,
      limit: 20,
    })

    // 관련 주제 필터링
    let learnings = allLearnings
    if (relevantSubjects && relevantSubjects.length > 0) {
      const subjectsLower = relevantSubjects.map(s => s.toLowerCase())
      learnings = allLearnings.filter(l =>
        subjectsLower.some(s =>
          l.subject.toLowerCase().includes(s) ||
          l.insight.toLowerCase().includes(s)
        )
      )
    }

    if (learnings.length === 0) {
      return ''
    }

    // 카테고리별 그룹화
    const grouped: Record<string, AgentLearning[]> = {}
    for (const learning of learnings) {
      if (!grouped[learning.category]) {
        grouped[learning.category] = []
      }
      grouped[learning.category].push(learning)
    }

    // 컨텍스트 문자열 생성
    let context = '### 학습된 인사이트\n\n'

    const categoryNames: Record<string, string> = {
      person: '사람들에 대해',
      project: '프로젝트',
      domain: '도메인 지식',
      workflow: '업무 패턴',
      preference: '선호도',
      decision_rule: '의사결정 규칙',
      lesson: '배운 교훈',
    }

    for (const [category, categoryLearnings] of Object.entries(grouped)) {
      context += `**${categoryNames[category] || category}:**\n`
      for (const l of categoryLearnings.slice(0, 5)) {
        context += `- ${l.subject}: ${l.insight} (확신도: ${l.confidence}%)\n`
      }
      context += '\n'
    }

    return context.trim()
  } catch (error) {
    console.error('[Learning] Context build failed:', error)
    return ''
  }
}

// ============================================
// Export
// ============================================

export default {
  saveLearning,
  getLearnings,
  getPersonLearnings,
  extractLearningsFromMemories,
  saveExtractedLearnings,
  learnFromConversation,
  generatePersonInsight,
  buildLearningContext,
}
