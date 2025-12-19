/**
 * Agent OS Memory Service v2.0
 *
 * PRD v2.0 기반 - 5가지 메모리 타입과 접근 제어
 * - Private: 1:1 대화 메모리 (관계별 격리)
 * - Meeting: 회의 참가자들에게만 공개
 * - Team: 팀 전체 공유
 * - Injected: 주입된 지식 (RAG)
 * - Execution: 워크플로우 실행 결과
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { OpenAIEmbeddings } from '@langchain/openai'

// ============================================
// Types
// ============================================

export type AgentMemoryType = 'private' | 'meeting' | 'team' | 'injected' | 'execution'

export interface AgentMemory {
  id: string
  agent_id: string
  memory_type: AgentMemoryType
  relationship_id?: string | null
  meeting_id?: string | null
  room_id?: string | null
  team_id?: string | null
  workflow_run_id?: string | null
  raw_content: string
  summary?: string | null
  importance: number
  access_count: number
  last_accessed_at?: string | null
  linked_memory_ids: string[]
  embedding?: number[] | null
  tags: string[]
  metadata: Record<string, any>
  created_at: string
}

export interface SaveAgentMemoryParams {
  agentId: string
  memoryType: AgentMemoryType
  content: string
  // 접근 범위 (메모리 타입에 따라 선택)
  relationshipId?: string | null  // private
  meetingId?: string | null       // meeting
  roomId?: string | null          // meeting/private
  teamId?: string | null          // team
  workflowRunId?: string | null   // execution
  // 옵션
  importance?: number
  tags?: string[]
  metadata?: Record<string, any>
  generateEmbedding?: boolean
}

export interface SearchAgentMemoriesParams {
  agentId: string
  query?: string
  memoryTypes?: AgentMemoryType[]
  // 접근 필터
  relationshipId?: string | null
  meetingId?: string | null
  teamId?: string | null
  // 검색 옵션
  limit?: number
  offset?: number
  minImportance?: number
  tags?: string[]
  // 벡터 검색
  useSemanticSearch?: boolean
  similarityThreshold?: number
}

export interface AgentMemorySearchResult extends AgentMemory {
  similarity?: number
  relevance_score?: number
}

// ============================================
// Service
// ============================================

let embeddings: OpenAIEmbeddings | null = null

function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
    })
  }
  return embeddings
}

/**
 * 에이전트 메모리 저장
 */
export async function saveAgentMemory(
  params: SaveAgentMemoryParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 임베딩 생성 (옵션)
    let embedding: number[] | null = null
    if (params.generateEmbedding !== false) {
      try {
        const embedder = getEmbeddings()
        embedding = await embedder.embedQuery(params.content)
      } catch (embeddingError) {
        console.warn('[AgentMemory] Embedding generation failed:', embeddingError)
        // 임베딩 실패해도 메모리는 저장
      }
    }

    const memoryRecord = {
      agent_id: params.agentId,
      memory_type: params.memoryType,
      relationship_id: params.relationshipId || null,
      meeting_id: params.meetingId || null,
      room_id: params.roomId || null,
      team_id: params.teamId || null,
      workflow_run_id: params.workflowRunId || null,
      raw_content: params.content,
      importance: params.importance ?? 5,
      tags: params.tags || [],
      metadata: params.metadata || {},
      embedding: embedding,
    }

    const { data, error } = await (supabase as any)
      .from('agent_memories')
      .insert(memoryRecord)
      .select('id')
      .single()

    if (error) {
      console.error('[AgentMemory] Save failed:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[AgentMemory] Error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Private 메모리 저장 (1:1 대화)
 */
export async function savePrivateMemory(params: {
  agentId: string
  relationshipId: string
  content: string
  roomId?: string | null
  importance?: number
  tags?: string[]
  metadata?: Record<string, any>
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveAgentMemory({
    agentId: params.agentId,
    memoryType: 'private',
    content: params.content,
    relationshipId: params.relationshipId,
    roomId: params.roomId,
    importance: params.importance,
    tags: params.tags,
    metadata: params.metadata,
  })
}

/**
 * Meeting 메모리 저장 (회의)
 */
export async function saveMeetingMemory(params: {
  agentId: string
  meetingId: string
  roomId: string
  content: string
  importance?: number
  tags?: string[]
  metadata?: Record<string, any>
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveAgentMemory({
    agentId: params.agentId,
    memoryType: 'meeting',
    content: params.content,
    meetingId: params.meetingId,
    roomId: params.roomId,
    importance: params.importance,
    tags: params.tags,
    metadata: params.metadata,
  })
}

/**
 * Team 메모리 저장 (팀 공용)
 */
export async function saveTeamMemory(params: {
  agentId: string
  teamId: string
  content: string
  importance?: number
  tags?: string[]
  metadata?: Record<string, any>
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveAgentMemory({
    agentId: params.agentId,
    memoryType: 'team',
    content: params.content,
    teamId: params.teamId,
    importance: params.importance,
    tags: params.tags,
    metadata: params.metadata,
  })
}

/**
 * Execution 메모리 저장 (워크플로우 결과)
 */
export async function saveExecutionMemory(params: {
  agentId: string
  workflowRunId: string
  content: string
  importance?: number
  tags?: string[]
  metadata?: Record<string, any>
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return saveAgentMemory({
    agentId: params.agentId,
    memoryType: 'execution',
    content: params.content,
    workflowRunId: params.workflowRunId,
    importance: params.importance,
    tags: params.tags,
    metadata: params.metadata,
  })
}

/**
 * 에이전트 메모리 검색
 */
export async function searchAgentMemories(
  params: SearchAgentMemoriesParams
): Promise<AgentMemorySearchResult[]> {
  try {
    const supabase = createAdminClient()

    let query = (supabase as any)
      .from('agent_memories')
      .select('*')
      .eq('agent_id', params.agentId)
      .order('created_at', { ascending: false })

    // 메모리 타입 필터
    if (params.memoryTypes && params.memoryTypes.length > 0) {
      query = query.in('memory_type', params.memoryTypes)
    }

    // 접근 범위 필터
    if (params.relationshipId) {
      query = query.eq('relationship_id', params.relationshipId)
    }
    if (params.meetingId) {
      query = query.eq('meeting_id', params.meetingId)
    }
    if (params.teamId) {
      query = query.eq('team_id', params.teamId)
    }

    // 중요도 필터
    if (params.minImportance) {
      query = query.gte('importance', params.minImportance)
    }

    // 태그 필터
    if (params.tags && params.tags.length > 0) {
      query = query.overlaps('tags', params.tags)
    }

    // 페이지네이션
    const limit = params.limit || 20
    const offset = params.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('[AgentMemory] Search failed:', error)
      return []
    }

    let results = (data || []) as AgentMemorySearchResult[]

    // 시맨틱 검색 (벡터 유사도)
    if (params.useSemanticSearch && params.query) {
      results = await semanticSearch(
        params.agentId,
        params.query,
        results,
        params.similarityThreshold || 0.7
      )
    }

    // 텍스트 검색 (키워드)
    if (params.query && !params.useSemanticSearch) {
      const queryLower = params.query.toLowerCase()
      results = results.filter(m =>
        m.raw_content.toLowerCase().includes(queryLower) ||
        m.summary?.toLowerCase().includes(queryLower)
      )
    }

    return results
  } catch (error) {
    console.error('[AgentMemory] Search error:', error)
    return []
  }
}

/**
 * 시맨틱 검색 (벡터 유사도 기반)
 */
async function semanticSearch(
  agentId: string,
  query: string,
  memories: AgentMemorySearchResult[],
  threshold: number
): Promise<AgentMemorySearchResult[]> {
  try {
    const embedder = getEmbeddings()
    const queryEmbedding = await embedder.embedQuery(query)

    // 메모리별 유사도 계산
    const withSimilarity = memories
      .filter(m => m.embedding)
      .map(m => {
        const similarity = cosineSimilarity(queryEmbedding, m.embedding!)
        return { ...m, similarity }
      })
      .filter(m => m.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)

    return withSimilarity
  } catch (error) {
    console.error('[AgentMemory] Semantic search failed:', error)
    return memories
  }
}

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 메모리 접근 기록 업데이트
 */
export async function recordMemoryAccess(memoryId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // 직접 업데이트
    await (supabase as any)
      .from('agent_memories')
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', memoryId)

    // access_count 증가는 별도 쿼리
    await (supabase as any).rpc('exec_sql', {
      query: `UPDATE agent_memories SET access_count = access_count + 1 WHERE id = '${memoryId}'`
    }).catch(() => {
      // RPC 없으면 무시 (access_count는 선택적)
    })
  } catch (error) {
    console.warn('[AgentMemory] Access record failed:', error)
  }
}

/**
 * 메모리 요약 업데이트
 */
export async function updateMemorySummary(
  memoryId: string,
  summary: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const { error } = await (supabase as any)
      .from('agent_memories')
      .update({ summary })
      .eq('id', memoryId)

    return !error
  } catch (error) {
    console.error('[AgentMemory] Summary update failed:', error)
    return false
  }
}

/**
 * 메모리 연결 (지식 그래프)
 */
export async function linkMemories(
  memoryId: string,
  linkedMemoryIds: string[]
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const { error } = await (supabase as any)
      .from('agent_memories')
      .update({
        linked_memory_ids: linkedMemoryIds,
      })
      .eq('id', memoryId)

    return !error
  } catch (error) {
    console.error('[AgentMemory] Memory linking failed:', error)
    return false
  }
}

/**
 * 관계별 최근 메모리 조회 (1:1 대화 컨텍스트)
 */
export async function getRecentPrivateMemories(
  agentId: string,
  relationshipId: string,
  limit: number = 10
): Promise<AgentMemory[]> {
  return searchAgentMemories({
    agentId,
    memoryTypes: ['private'],
    relationshipId,
    limit,
  })
}

/**
 * 회의 메모리 조회
 */
export async function getMeetingMemories(
  agentId: string,
  meetingId: string
): Promise<AgentMemory[]> {
  return searchAgentMemories({
    agentId,
    memoryTypes: ['meeting'],
    meetingId,
    limit: 100,
  })
}

/**
 * 중요한 메모리 조회
 */
export async function getImportantMemories(
  agentId: string,
  minImportance: number = 8,
  limit: number = 20
): Promise<AgentMemory[]> {
  return searchAgentMemories({
    agentId,
    minImportance,
    limit,
  })
}

// ============================================
// Export
// ============================================

export default {
  saveAgentMemory,
  savePrivateMemory,
  saveMeetingMemory,
  saveTeamMemory,
  saveExecutionMemory,
  searchAgentMemories,
  recordMemoryAccess,
  updateMemorySummary,
  linkMemories,
  getRecentPrivateMemories,
  getMeetingMemories,
  getImportantMemories,
}
