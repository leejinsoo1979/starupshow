/**
 * Agent Memory Compression Service
 *
 * Layer 2: Compressed Memory
 * - 메모리 요약 및 압축
 * - 중요도 자동 산정
 * - 배치 압축 처리
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { ChatOpenAI } from '@langchain/openai'
import type { AgentMemory } from './agent-memory-service'

// ============================================
// Types
// ============================================

export interface CompressionResult {
  memoryId: string
  summary: string
  importance: number
  keywords: string[]
}

export interface BatchCompressionResult {
  processed: number
  failed: number
  results: CompressionResult[]
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
// Compression Functions
// ============================================

/**
 * 단일 메모리 요약 생성
 */
export async function compressMemory(
  memory: AgentMemory
): Promise<CompressionResult | null> {
  try {
    const model = getModel()

    const prompt = `다음 대화/이벤트 내용을 분석하세요:

"""
${memory.raw_content.substring(0, 2000)}
"""

다음 JSON 형식으로 응답하세요:
{
  "summary": "핵심 내용 1-2문장 요약",
  "importance": 1-10 (중요도 점수),
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

중요도 기준:
- 1-3: 일상적 대화, 인사
- 4-6: 일반적 업무 논의, 정보 공유
- 7-8: 중요한 의사결정, 핵심 인사이트
- 9-10: 매우 중요한 결정, 프로젝트 마일스톤

JSON만 반환하세요.`

    const response = await model.invoke(prompt)
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        memoryId: memory.id,
        summary: parsed.summary || '',
        importance: Math.min(10, Math.max(1, parsed.importance || 5)),
        keywords: parsed.keywords || [],
      }
    }

    return null
  } catch (error) {
    console.error('[Compression] Failed:', error)
    return null
  }
}

/**
 * 배치 메모리 압축
 */
export async function compressMemoriesBatch(
  agentId: string,
  limit: number = 50
): Promise<BatchCompressionResult> {
  const supabase = createAdminClient()
  const result: BatchCompressionResult = {
    processed: 0,
    failed: 0,
    results: [],
  }

  try {
    // 요약이 없는 메모리 조회
    const { data: memories, error } = await (supabase as any)
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agentId)
      .is('summary', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !memories) {
      console.error('[Compression] Fetch failed:', error)
      return result
    }

    // 각 메모리 압축
    for (const memory of memories) {
      const compressed = await compressMemory(memory as AgentMemory)

      if (compressed) {
        // DB 업데이트
        const { error: updateError } = await (supabase as any)
          .from('agent_memories')
          .update({
            summary: compressed.summary,
            importance: compressed.importance,
            tags: Array.from(new Set([...(memory.tags || []), ...compressed.keywords])),
          })
          .eq('id', memory.id)

        if (!updateError) {
          result.processed++
          result.results.push(compressed)
        } else {
          result.failed++
        }
      } else {
        result.failed++
      }
    }

    return result
  } catch (error) {
    console.error('[Compression] Batch failed:', error)
    return result
  }
}

/**
 * 대화 세션 요약 생성
 */
export async function summarizeConversationSession(
  agentId: string,
  relationshipId: string,
  sessionStartTime: string,
  sessionEndTime: string
): Promise<{ summary: string; keyPoints: string[] } | null> {
  try {
    const supabase = createAdminClient()

    // 세션의 모든 메모리 조회
    const { data: memories } = await (supabase as any)
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agentId)
      .eq('relationship_id', relationshipId)
      .gte('created_at', sessionStartTime)
      .lte('created_at', sessionEndTime)
      .order('created_at', { ascending: true })

    if (!memories || memories.length === 0) {
      return null
    }

    // 대화 내용 합치기
    const conversationText = memories
      .map((m: any) => m.raw_content)
      .join('\n\n')
      .substring(0, 4000)

    const model = getModel()

    const prompt = `다음 대화 세션을 분석하세요:

"""
${conversationText}
"""

다음 JSON 형식으로 응답하세요:
{
  "summary": "전체 대화 요약 (2-3문장)",
  "keyPoints": ["핵심 포인트1", "핵심 포인트2", "핵심 포인트3"]
}

JSON만 반환하세요.`

    const response = await model.invoke(prompt)
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
      }
    }

    return null
  } catch (error) {
    console.error('[Compression] Session summary failed:', error)
    return null
  }
}

/**
 * 일일 메모리 요약 생성
 */
export async function generateDailySummary(
  agentId: string,
  date: string  // YYYY-MM-DD
): Promise<{ summary: string; highlights: string[]; stats: Record<string, number> } | null> {
  try {
    const supabase = createAdminClient()
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    // 하루 메모리 조회
    const { data: memories } = await (supabase as any)
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('importance', { ascending: false })
      .limit(50)

    if (!memories || memories.length === 0) {
      return null
    }

    // 통계 계산
    const stats: Record<string, number> = {
      total_memories: memories.length,
      private_count: memories.filter((m: any) => m.memory_type === 'private').length,
      meeting_count: memories.filter((m: any) => m.memory_type === 'meeting').length,
      team_count: memories.filter((m: any) => m.memory_type === 'team').length,
      avg_importance: memories.reduce((sum: number, m: any) => sum + (m.importance || 5), 0) / memories.length,
    }

    // 중요한 메모리만 요약용으로 사용
    const importantMemories = memories
      .filter((m: any) => (m.importance || 5) >= 6)
      .slice(0, 10)

    if (importantMemories.length === 0) {
      return {
        summary: `${date}에 ${memories.length}개의 메모리가 기록되었습니다.`,
        highlights: [],
        stats,
      }
    }

    const model = getModel()

    const memorySummaries = importantMemories
      .map((m: any) => m.summary || m.raw_content.substring(0, 200))
      .join('\n- ')

    const prompt = `다음은 AI 에이전트의 하루 주요 활동입니다:

- ${memorySummaries}

다음 JSON 형식으로 하루 요약을 작성하세요:
{
  "summary": "하루 활동 요약 (2-3문장)",
  "highlights": ["주요 활동/성과1", "주요 활동/성과2"]
}

JSON만 반환하세요.`

    const response = await model.invoke(prompt)
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || '',
        highlights: parsed.highlights || [],
        stats,
      }
    }

    return { summary: '', highlights: [], stats }
  } catch (error) {
    console.error('[Compression] Daily summary failed:', error)
    return null
  }
}

// ============================================
// Export
// ============================================

export default {
  compressMemory,
  compressMemoriesBatch,
  summarizeConversationSession,
  generateDailySummary,
}
