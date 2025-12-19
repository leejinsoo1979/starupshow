/**
 * Agent Memory Search Service v2.0
 *
 * PRD v2.0 Phase 2.3: 메모리 벡터 검색 서비스
 * - searchMemories(): pgvector 기반 벡터 검색
 * - filterByPermission(): 권한 기반 필터링
 * - rankByRelevance(): 복합 관련성 정렬
 * - hybridSearch(): 시맨틱 + 시간 + 중요도 통합 검색
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { OpenAIEmbeddings } from '@langchain/openai'
import { AgentMemory, AgentMemoryType, AgentMemorySearchResult } from './agent-memory-service'

// ============================================
// Types
// ============================================

export interface VectorSearchParams {
  agentId: string
  query: string
  memoryTypes?: AgentMemoryType[]
  // 접근 범위
  relationshipId?: string | null
  meetingId?: string | null
  teamId?: string | null
  roomId?: string | null
  // 검색 옵션
  limit?: number
  similarityThreshold?: number
  minImportance?: number
  tags?: string[]
  startDate?: Date | null
  endDate?: Date | null
}

export interface HybridSearchParams extends VectorSearchParams {
  // 가중치 (합이 1.0)
  weights?: {
    semantic?: number    // 시맨틱 유사도 가중치 (기본: 0.5)
    recency?: number     // 시간 근접성 가중치 (기본: 0.3)
    importance?: number  // 중요도 가중치 (기본: 0.2)
  }
  daysLimit?: number  // 시간 점수 계산 기준 일수
}

export interface SearchResultWithScores extends AgentMemorySearchResult {
  similarity: number
  recency_score?: number
  importance_score?: number
  combined_score?: number
  rank?: number
}

export interface PermissionCheckResult {
  memoryId: string
  hasAccess: boolean
  accessReason: 'owner' | 'relationship_partner' | 'meeting_participant' | 'team_member' | 'no_access'
}

export interface MemoryGraphData {
  nodes: Array<{
    id: string
    type: AgentMemoryType
    label: string
    importance: number
    tags: string[]
    created_at: string
  }>
  edges: Array<{
    source: string
    target: string
    type: 'linked'
  }>
}

export interface KnowledgeSearchParams {
  agentId: string
  query: string
  limit?: number
  similarityThreshold?: number
  category?: string | null
  accessLevel?: 'private' | 'team' | 'public' | null
  tags?: string[]
}

export interface KnowledgeSearchResult {
  id: string
  agentId: string
  title: string
  content: string
  fileUrl?: string | null
  fileType?: string | null
  category?: string | null
  accessLevel: 'private' | 'team' | 'public'
  tags: string[]
  metadata: Record<string, unknown>
  chunkIndex: number
  totalChunks: number
  parentDocId?: string | null
  createdAt: string
  similarity: number
}

// ============================================
// Embeddings Singleton
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

// ============================================
// Vector Search Functions
// ============================================

/**
 * 벡터 유사도 검색 (pgvector RPC)
 * DB 레벨에서 효율적인 벡터 검색 수행
 */
export async function searchMemories(
  params: VectorSearchParams
): Promise<SearchResultWithScores[]> {
  try {
    const supabase = createAdminClient()

    // 쿼리 임베딩 생성
    const embedder = getEmbeddings()
    const queryEmbedding = await embedder.embedQuery(params.query)

    // pgvector RPC 호출
    const { data, error } = await (supabase as any).rpc('search_agent_memories_by_embedding', {
      p_agent_id: params.agentId,
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_memory_types: params.memoryTypes || null,
      p_match_threshold: params.similarityThreshold ?? 0.7,
      p_match_count: params.limit ?? 20,
      p_relationship_id: params.relationshipId || null,
      p_meeting_id: params.meetingId || null,
      p_team_id: params.teamId || null,
      p_room_id: params.roomId || null,
      p_min_importance: params.minImportance || null,
      p_tags: params.tags || null,
      p_start_date: params.startDate?.toISOString() || null,
      p_end_date: params.endDate?.toISOString() || null,
    })

    if (error) {
      console.error('[AgentMemorySearch] Vector search failed:', error)
      throw new Error(`Vector search failed: ${error.message}`)
    }

    // 결과 매핑
    return (data || []).map((row: any) => ({
      id: row.id,
      agent_id: row.agent_id,
      memory_type: row.memory_type as AgentMemoryType,
      relationship_id: row.relationship_id,
      meeting_id: row.meeting_id,
      room_id: row.room_id,
      team_id: row.team_id,
      raw_content: row.raw_content,
      summary: row.summary,
      importance: row.importance,
      access_count: 0,
      last_accessed_at: null,
      linked_memory_ids: [],
      embedding: null,
      tags: row.tags || [],
      metadata: row.metadata || {},
      created_at: row.created_at,
      similarity: row.similarity,
    }))
  } catch (error) {
    console.error('[AgentMemorySearch] Error:', error)
    throw error
  }
}

/**
 * 하이브리드 검색 (시맨틱 + 시간 + 중요도)
 * PRD: rankByRelevance() 구현
 */
export async function hybridSearch(
  params: HybridSearchParams
): Promise<SearchResultWithScores[]> {
  try {
    const supabase = createAdminClient()

    // 쿼리 임베딩 생성
    const embedder = getEmbeddings()
    const queryEmbedding = await embedder.embedQuery(params.query)

    // 가중치 기본값
    const weights = {
      semantic: params.weights?.semantic ?? 0.5,
      recency: params.weights?.recency ?? 0.3,
      importance: params.weights?.importance ?? 0.2,
    }

    // 하이브리드 검색 RPC 호출
    const { data, error } = await (supabase as any).rpc('hybrid_search_agent_memories', {
      p_agent_id: params.agentId,
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_memory_types: params.memoryTypes || null,
      p_match_count: params.limit ?? 20,
      p_weight_semantic: weights.semantic,
      p_weight_recency: weights.recency,
      p_weight_importance: weights.importance,
      p_relationship_id: params.relationshipId || null,
      p_meeting_id: params.meetingId || null,
      p_team_id: params.teamId || null,
      p_min_importance: params.minImportance || null,
      p_tags: params.tags || null,
      p_days_limit: params.daysLimit ?? 30,
    })

    if (error) {
      console.error('[AgentMemorySearch] Hybrid search failed:', error)
      throw new Error(`Hybrid search failed: ${error.message}`)
    }

    // 결과 매핑
    return (data || []).map((row: any) => ({
      id: row.id,
      agent_id: row.agent_id,
      memory_type: row.memory_type as AgentMemoryType,
      relationship_id: row.relationship_id,
      meeting_id: row.meeting_id,
      room_id: row.room_id,
      team_id: row.team_id,
      raw_content: row.raw_content,
      summary: row.summary,
      importance: row.importance,
      access_count: 0,
      last_accessed_at: null,
      linked_memory_ids: [],
      embedding: null,
      tags: row.tags || [],
      metadata: row.metadata || {},
      created_at: row.created_at,
      similarity: row.similarity,
      recency_score: row.recency_score,
      importance_score: row.importance_score,
      combined_score: row.combined_score,
    }))
  } catch (error) {
    console.error('[AgentMemorySearch] Hybrid search error:', error)
    throw error
  }
}

/**
 * 풀텍스트 검색 (한국어 tsvector)
 * 키워드 기반 빠른 검색
 */
export async function fulltextSearch(
  params: VectorSearchParams
): Promise<SearchResultWithScores[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await (supabase as any).rpc('fulltext_search_agent_memories', {
      p_agent_id: params.agentId,
      p_search_query: params.query,
      p_memory_types: params.memoryTypes || null,
      p_limit: params.limit ?? 20,
      p_relationship_id: params.relationshipId || null,
      p_meeting_id: params.meetingId || null,
      p_team_id: params.teamId || null,
    })

    if (error) {
      console.error('[AgentMemorySearch] Fulltext search failed:', error)
      throw new Error(`Fulltext search failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      agent_id: row.agent_id,
      memory_type: row.memory_type as AgentMemoryType,
      relationship_id: null,
      meeting_id: null,
      room_id: null,
      team_id: null,
      raw_content: row.raw_content,
      summary: row.summary,
      importance: row.importance,
      access_count: 0,
      last_accessed_at: null,
      linked_memory_ids: [],
      embedding: null,
      tags: row.tags || [],
      metadata: {},
      created_at: row.created_at,
      similarity: 0,
      rank: row.rank,
    }))
  } catch (error) {
    console.error('[AgentMemorySearch] Fulltext search error:', error)
    throw error
  }
}

// ============================================
// Permission Functions
// ============================================

/**
 * 권한 필터링 (PRD: filterByPermission)
 * 사용자가 접근 가능한 메모리만 필터링
 */
export async function filterByPermission(
  agentId: string,
  userId: string,
  memoryIds: string[]
): Promise<PermissionCheckResult[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await (supabase as any).rpc('filter_memories_by_permission', {
      p_agent_id: agentId,
      p_user_id: userId,
      p_memory_ids: memoryIds,
    })

    if (error) {
      console.error('[AgentMemorySearch] Permission filter failed:', error)
      throw new Error(`Permission filter failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      memoryId: row.memory_id,
      hasAccess: row.has_access,
      accessReason: row.access_reason,
    }))
  } catch (error) {
    console.error('[AgentMemorySearch] Permission filter error:', error)
    throw error
  }
}

/**
 * 접근 가능한 메모리만 반환
 */
export async function getAccessibleMemories(
  agentId: string,
  userId: string,
  memories: AgentMemorySearchResult[]
): Promise<AgentMemorySearchResult[]> {
  if (memories.length === 0) return []

  const memoryIds = memories.map(m => m.id)
  const permissions = await filterByPermission(agentId, userId, memoryIds)

  const accessibleIds = new Set(
    permissions
      .filter(p => p.hasAccess)
      .map(p => p.memoryId)
  )

  return memories.filter(m => accessibleIds.has(m.id))
}

// ============================================
// Knowledge Base Search
// ============================================

/**
 * 지식베이스 검색
 */
export async function searchKnowledgeBase(
  params: KnowledgeSearchParams
): Promise<KnowledgeSearchResult[]> {
  try {
    const supabase = createAdminClient()

    // 쿼리 임베딩 생성
    const embedder = getEmbeddings()
    const queryEmbedding = await embedder.embedQuery(params.query)

    const { data, error } = await (supabase as any).rpc('search_agent_knowledge_base', {
      p_agent_id: params.agentId,
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_match_threshold: params.similarityThreshold ?? 0.7,
      p_match_count: params.limit ?? 10,
      p_category: params.category || null,
      p_access_level: params.accessLevel || null,
      p_tags: params.tags || null,
    })

    if (error) {
      console.error('[AgentMemorySearch] Knowledge base search failed:', error)
      throw new Error(`Knowledge base search failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      agentId: row.agent_id,
      title: row.title,
      content: row.content,
      fileUrl: row.file_url,
      fileType: row.file_type,
      category: row.category,
      accessLevel: row.access_level,
      tags: row.tags || [],
      metadata: row.metadata || {},
      chunkIndex: row.chunk_index,
      totalChunks: row.total_chunks,
      parentDocId: row.parent_doc_id,
      createdAt: row.created_at,
      similarity: row.similarity,
    }))
  } catch (error) {
    console.error('[AgentMemorySearch] Knowledge base search error:', error)
    throw error
  }
}

// ============================================
// Graph Functions
// ============================================

/**
 * 연결된 메모리 조회 (지식 그래프)
 */
export async function getLinkedMemories(
  memoryId: string,
  depth: number = 1
): Promise<AgentMemory[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await (supabase as any).rpc('get_linked_memories', {
      p_memory_id: memoryId,
      p_depth: depth,
    })

    if (error) {
      console.error('[AgentMemorySearch] Get linked memories failed:', error)
      throw new Error(`Get linked memories failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      agent_id: row.agent_id,
      memory_type: row.memory_type as AgentMemoryType,
      relationship_id: null,
      meeting_id: null,
      room_id: null,
      team_id: null,
      workflow_run_id: null,
      raw_content: row.raw_content,
      summary: row.summary,
      importance: row.importance,
      access_count: 0,
      last_accessed_at: null,
      linked_memory_ids: [],
      embedding: null,
      tags: row.tags || [],
      metadata: {
        link_depth: row.link_depth,
        linked_from: row.linked_from,
      },
      created_at: row.created_at,
    }))
  } catch (error) {
    console.error('[AgentMemorySearch] Get linked memories error:', error)
    throw error
  }
}

/**
 * 메모리 그래프 데이터 조회 (3D 시각화용)
 */
export async function getMemoryGraphData(
  agentId: string,
  options?: {
    limit?: number
    memoryTypes?: AgentMemoryType[]
    minImportance?: number
  }
): Promise<MemoryGraphData> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await (supabase as any).rpc('get_memory_graph_data', {
      p_agent_id: agentId,
      p_limit: options?.limit ?? 100,
      p_memory_types: options?.memoryTypes || null,
      p_min_importance: options?.minImportance ?? 5,
    })

    if (error) {
      console.error('[AgentMemorySearch] Get memory graph failed:', error)
      throw new Error(`Get memory graph failed: ${error.message}`)
    }

    const result = data?.[0] || { nodes: [], edges: [] }

    return {
      nodes: result.nodes || [],
      edges: result.edges || [],
    }
  } catch (error) {
    console.error('[AgentMemorySearch] Get memory graph error:', error)
    throw error
  }
}

// ============================================
// Context Building (대화 컨텍스트 구성)
// ============================================

/**
 * 대화 컨텍스트용 메모리 검색
 * 현재 대화에 관련된 메모리들을 수집
 */
export async function buildConversationContext(params: {
  agentId: string
  userId: string
  relationshipId: string
  currentMessage: string
  options?: {
    maxMemories?: number
    includeKnowledge?: boolean
    includeTeamMemories?: boolean
  }
}): Promise<{
  privateMemories: SearchResultWithScores[]
  knowledgeBase: KnowledgeSearchResult[]
  teamMemories: SearchResultWithScores[]
}> {
  const maxMemories = params.options?.maxMemories ?? 10

  // 병렬로 검색 실행
  const [privateMemories, knowledgeBase, teamMemories] = await Promise.all([
    // 1. Private 메모리 (해당 관계의 대화 기록)
    hybridSearch({
      agentId: params.agentId,
      query: params.currentMessage,
      memoryTypes: ['private'],
      relationshipId: params.relationshipId,
      limit: maxMemories,
      weights: {
        semantic: 0.4,
        recency: 0.4,
        importance: 0.2,
      },
    }),

    // 2. 지식베이스 (주입된 지식)
    params.options?.includeKnowledge !== false
      ? searchKnowledgeBase({
          agentId: params.agentId,
          query: params.currentMessage,
          limit: 5,
        })
      : Promise.resolve([]),

    // 3. 팀 메모리 (공유 지식)
    params.options?.includeTeamMemories !== false
      ? hybridSearch({
          agentId: params.agentId,
          query: params.currentMessage,
          memoryTypes: ['team'],
          limit: 5,
          weights: {
            semantic: 0.6,
            recency: 0.2,
            importance: 0.2,
          },
        })
      : Promise.resolve([]),
  ])

  return {
    privateMemories,
    knowledgeBase,
    teamMemories,
  }
}

/**
 * 메모리를 LLM 컨텍스트 문자열로 변환
 */
export function formatMemoriesForContext(
  memories: SearchResultWithScores[],
  maxTokens: number = 2000
): string {
  if (memories.length === 0) return ''

  const lines: string[] = []
  let estimatedTokens = 0

  for (const memory of memories) {
    const content = memory.summary || memory.raw_content
    const date = new Date(memory.created_at).toLocaleDateString('ko-KR')
    const line = `[${date}] ${content}`

    // 대략적인 토큰 추정 (한글은 대략 1.5자당 1토큰)
    const lineTokens = Math.ceil(line.length / 1.5)

    if (estimatedTokens + lineTokens > maxTokens) break

    lines.push(line)
    estimatedTokens += lineTokens
  }

  return lines.join('\n')
}

// ============================================
// Export
// ============================================

export default {
  // 벡터 검색
  searchMemories,
  hybridSearch,
  fulltextSearch,
  // 권한 필터
  filterByPermission,
  getAccessibleMemories,
  // 지식베이스
  searchKnowledgeBase,
  // 그래프
  getLinkedMemories,
  getMemoryGraphData,
  // 컨텍스트
  buildConversationContext,
  formatMemoriesForContext,
}
