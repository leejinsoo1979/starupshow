/**
 * Agent Knowledge Injection Service v2.0
 *
 * PRD v2.0 Phase 5: 지식 주입 시스템
 * - 문서 업로드 및 파싱
 * - 청킹 및 임베딩 생성
 * - 지식베이스 검색
 * - RAG (Retrieval Augmented Generation) 지원
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// ============================================
// Types
// ============================================

export type AccessLevel = 'private' | 'team' | 'public'

export interface KnowledgeDocument {
  id: string
  agentId: string
  title: string
  content: string
  fileUrl?: string | null
  fileType?: string | null
  category?: string | null
  accessLevel: AccessLevel
  tags: string[]
  metadata: Record<string, unknown>
  chunkIndex: number
  totalChunks: number
  parentDocId?: string | null
  createdAt: string
  updatedAt: string
}

export interface UploadDocumentParams {
  agentId: string
  title: string
  content: string
  fileUrl?: string
  fileType?: string
  category?: string
  accessLevel?: AccessLevel
  tags?: string[]
  metadata?: Record<string, unknown>
  // 청킹 옵션
  chunkSize?: number
  chunkOverlap?: number
}

export interface UploadResult {
  success: boolean
  documentId?: string
  chunksCreated: number
  error?: string
}

export interface KnowledgeSearchParams {
  agentId: string
  query: string
  limit?: number
  similarityThreshold?: number
  category?: string | null
  accessLevel?: AccessLevel | null
  tags?: string[]
}

export interface KnowledgeSearchResult {
  id: string
  title: string
  content: string
  similarity: number
  category?: string | null
  tags: string[]
  chunkIndex: number
  totalChunks: number
  parentDocId?: string | null
}

// ============================================
// Constants
// ============================================

const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_CHUNK_OVERLAP = 200
const MAX_DOCUMENT_SIZE = 500000  // 500KB 텍스트

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
// Document Upload & Chunking
// ============================================

/**
 * 문서 업로드 및 청킹
 */
export async function uploadDocument(
  params: UploadDocumentParams
): Promise<UploadResult> {
  try {
    const supabase = createAdminClient()

    // 문서 크기 검증
    if (params.content.length > MAX_DOCUMENT_SIZE) {
      return {
        success: false,
        chunksCreated: 0,
        error: `문서가 너무 큽니다. 최대 ${MAX_DOCUMENT_SIZE / 1000}KB까지 허용됩니다.`,
      }
    }

    // 텍스트 청킹
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: params.chunkSize || DEFAULT_CHUNK_SIZE,
      chunkOverlap: params.chunkOverlap || DEFAULT_CHUNK_OVERLAP,
      separators: ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', ''],
    })

    const chunks = await splitter.splitText(params.content)
    const totalChunks = chunks.length

    // 임베딩 생성
    const embedder = getEmbeddings()
    const chunkEmbeddings = await embedder.embedDocuments(chunks)

    // 첫 번째 청크 (원본 문서 대표)
    const parentDoc = {
      agent_id: params.agentId,
      title: params.title,
      content: chunks[0],
      file_url: params.fileUrl || null,
      file_type: params.fileType || null,
      category: params.category || null,
      access_level: params.accessLevel || 'private',
      tags: params.tags || [],
      metadata: params.metadata || {},
      chunk_index: 0,
      total_chunks: totalChunks,
      parent_doc_id: null,
      embedding: chunkEmbeddings[0],
    }

    const { data: parentData, error: parentError } = await (supabase as any)
      .from('agent_knowledge_base')
      .insert(parentDoc)
      .select('id')
      .single()

    if (parentError) {
      console.error('[KnowledgeService] Parent doc insert failed:', parentError)
      return {
        success: false,
        chunksCreated: 0,
        error: parentError.message,
      }
    }

    const parentId = parentData.id
    let chunksCreated = 1

    // 나머지 청크 저장
    if (chunks.length > 1) {
      const childDocs = chunks.slice(1).map((chunk: string, index: number) => ({
        agent_id: params.agentId,
        title: `${params.title} (${index + 2}/${totalChunks})`,
        content: chunk,
        file_url: null,
        file_type: params.fileType || null,
        category: params.category || null,
        access_level: params.accessLevel || 'private',
        tags: params.tags || [],
        metadata: {},
        chunk_index: index + 1,
        total_chunks: totalChunks,
        parent_doc_id: parentId,
        embedding: chunkEmbeddings[index + 1],
      }))

      const { error: childError } = await (supabase as any)
        .from('agent_knowledge_base')
        .insert(childDocs)

      if (childError) {
        console.warn('[KnowledgeService] Some chunks failed:', childError)
      } else {
        chunksCreated = chunks.length
      }
    }

    console.log(`[KnowledgeService] Uploaded document "${params.title}" with ${chunksCreated} chunks`)

    return {
      success: true,
      documentId: parentId,
      chunksCreated,
    }
  } catch (error) {
    console.error('[KnowledgeService] Upload error:', error)
    return {
      success: false,
      chunksCreated: 0,
      error: String(error),
    }
  }
}

/**
 * URL에서 문서 가져와서 업로드
 */
export async function uploadFromUrl(
  agentId: string,
  url: string,
  options?: {
    title?: string
    category?: string
    accessLevel?: AccessLevel
    tags?: string[]
  }
): Promise<UploadResult> {
  try {
    // URL 내용 가져오기
    const response = await fetch(url)
    if (!response.ok) {
      return {
        success: false,
        chunksCreated: 0,
        error: `URL 가져오기 실패: ${response.status}`,
      }
    }

    const content = await response.text()
    const urlObj = new URL(url)
    const filename = urlObj.pathname.split('/').pop() || 'document'

    return uploadDocument({
      agentId,
      title: options?.title || filename,
      content,
      fileUrl: url,
      fileType: detectFileType(url),
      category: options?.category,
      accessLevel: options?.accessLevel,
      tags: options?.tags,
    })
  } catch (error) {
    console.error('[KnowledgeService] URL upload error:', error)
    return {
      success: false,
      chunksCreated: 0,
      error: String(error),
    }
  }
}

function detectFileType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    md: 'markdown',
    txt: 'text',
    pdf: 'pdf',
    docx: 'docx',
    html: 'html',
    json: 'json',
    csv: 'csv',
  }
  return typeMap[ext || ''] || 'text'
}

// ============================================
// Knowledge Search
// ============================================

/**
 * 지식베이스 시맨틱 검색
 */
export async function searchKnowledge(
  params: KnowledgeSearchParams
): Promise<KnowledgeSearchResult[]> {
  try {
    const supabase = createAdminClient()

    // 쿼리 임베딩 생성
    const embedder = getEmbeddings()
    const queryEmbedding = await embedder.embedQuery(params.query)

    // pgvector RPC 호출
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
      console.error('[KnowledgeService] Search failed:', error)
      throw new Error(`Knowledge search failed: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      similarity: row.similarity,
      category: row.category,
      tags: row.tags || [],
      chunkIndex: row.chunk_index,
      totalChunks: row.total_chunks,
      parentDocId: row.parent_doc_id,
    }))
  } catch (error) {
    console.error('[KnowledgeService] Search error:', error)
    throw error
  }
}

/**
 * 전체 문서 조회 (특정 parentId의 모든 청크)
 */
export async function getFullDocument(
  documentId: string
): Promise<{ title: string; content: string; metadata: Record<string, unknown> } | null> {
  try {
    const supabase = createAdminClient()

    // 부모 문서 조회
    const { data: parent } = await (supabase as any)
      .from('agent_knowledge_base')
      .select('*')
      .eq('id', documentId)
      .single()

    if (!parent) {
      return null
    }

    // 모든 청크 조회
    const { data: chunks } = await (supabase as any)
      .from('agent_knowledge_base')
      .select('content, chunk_index')
      .or(`id.eq.${documentId},parent_doc_id.eq.${documentId}`)
      .order('chunk_index')

    if (!chunks || chunks.length === 0) {
      return {
        title: parent.title,
        content: parent.content,
        metadata: parent.metadata,
      }
    }

    // 청크 결합
    const fullContent = chunks.map((c: any) => c.content).join('\n\n')

    return {
      title: parent.title,
      content: fullContent,
      metadata: parent.metadata,
    }
  } catch (error) {
    console.error('[KnowledgeService] Get full document error:', error)
    return null
  }
}

// ============================================
// Knowledge Management
// ============================================

/**
 * 에이전트의 지식베이스 목록 조회
 */
export async function listKnowledgeDocuments(
  agentId: string,
  options?: {
    category?: string
    accessLevel?: AccessLevel
    limit?: number
    offset?: number
  }
): Promise<{
  documents: Array<{
    id: string
    title: string
    category: string | null
    accessLevel: AccessLevel
    totalChunks: number
    createdAt: string
  }>
  total: number
}> {
  try {
    const supabase = createAdminClient()

    let query = (supabase as any)
      .from('agent_knowledge_base')
      .select('id, title, category, access_level, total_chunks, created_at', { count: 'exact' })
      .eq('agent_id', agentId)
      .is('parent_doc_id', null)  // 부모 문서만
      .order('created_at', { ascending: false })

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    if (options?.accessLevel) {
      query = query.eq('access_level', options.accessLevel)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[KnowledgeService] List error:', error)
      return { documents: [], total: 0 }
    }

    return {
      documents: (data || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        accessLevel: doc.access_level,
        totalChunks: doc.total_chunks,
        createdAt: doc.created_at,
      })),
      total: count || 0,
    }
  } catch (error) {
    console.error('[KnowledgeService] List error:', error)
    return { documents: [], total: 0 }
  }
}

/**
 * 문서 삭제 (청크 포함)
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // 자식 청크 먼저 삭제
    await (supabase as any)
      .from('agent_knowledge_base')
      .delete()
      .eq('parent_doc_id', documentId)

    // 부모 문서 삭제
    const { error } = await (supabase as any)
      .from('agent_knowledge_base')
      .delete()
      .eq('id', documentId)

    return !error
  } catch (error) {
    console.error('[KnowledgeService] Delete error:', error)
    return false
  }
}

/**
 * 카테고리별 통계
 */
export async function getKnowledgeStats(agentId: string): Promise<{
  totalDocuments: number
  totalChunks: number
  byCategory: Record<string, number>
  byAccessLevel: Record<AccessLevel, number>
}> {
  try {
    const supabase = createAdminClient()

    const { data } = await (supabase as any)
      .from('agent_knowledge_base')
      .select('category, access_level, parent_doc_id')
      .eq('agent_id', agentId)

    if (!data || data.length === 0) {
      return {
        totalDocuments: 0,
        totalChunks: 0,
        byCategory: {},
        byAccessLevel: { private: 0, team: 0, public: 0 },
      }
    }

    const parentDocs = (data as any[]).filter((d) => !d.parent_doc_id)
    const byCategory = parentDocs.reduce((acc: Record<string, number>, d) => {
      const cat = d.category || 'uncategorized'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byAccessLevel = parentDocs.reduce(
      (acc: Record<AccessLevel, number>, d) => {
        acc[d.access_level as AccessLevel] = (acc[d.access_level as AccessLevel] || 0) + 1
        return acc
      },
      { private: 0, team: 0, public: 0 } as Record<AccessLevel, number>
    )

    return {
      totalDocuments: parentDocs.length,
      totalChunks: data.length,
      byCategory,
      byAccessLevel,
    }
  } catch (error) {
    console.error('[KnowledgeService] Stats error:', error)
    return {
      totalDocuments: 0,
      totalChunks: 0,
      byCategory: {},
      byAccessLevel: { private: 0, team: 0, public: 0 },
    }
  }
}

// ============================================
// RAG Context Building
// ============================================

/**
 * 지식 기반 컨텍스트 생성 (RAG)
 */
export async function buildKnowledgeContext(
  agentId: string,
  query: string,
  options?: {
    maxResults?: number
    maxTokens?: number
    category?: string
  }
): Promise<{
  context: string
  sources: Array<{ title: string; similarity: number }>
}> {
  const maxResults = options?.maxResults ?? 5
  const maxTokens = options?.maxTokens ?? 2000

  // 관련 지식 검색
  const results = await searchKnowledge({
    agentId,
    query,
    limit: maxResults,
    category: options?.category,
    similarityThreshold: 0.6,
  })

  if (results.length === 0) {
    return { context: '', sources: [] }
  }

  // 컨텍스트 구성
  const contextParts: string[] = []
  const sources: Array<{ title: string; similarity: number }> = []
  let estimatedTokens = 0

  for (const result of results) {
    // 대략적인 토큰 추정 (한글 약 1.5자당 1토큰)
    const contentTokens = Math.ceil(result.content.length / 1.5)

    if (estimatedTokens + contentTokens > maxTokens) {
      break
    }

    contextParts.push(`### ${result.title}\n${result.content}`)
    sources.push({
      title: result.title,
      similarity: result.similarity,
    })
    estimatedTokens += contentTokens
  }

  return {
    context: contextParts.join('\n\n'),
    sources,
  }
}

/**
 * 지식 컨텍스트를 프롬프트 형식으로 변환
 */
export function formatKnowledgeForPrompt(
  context: string,
  sources: Array<{ title: string; similarity: number }>
): string {
  if (!context) return ''

  let prompt = '### 참고 지식\n'
  prompt += '다음은 관련 지식베이스에서 검색된 내용입니다:\n\n'
  prompt += context
  prompt += '\n\n### 출처\n'
  prompt += sources.map(s => `- ${s.title} (관련도: ${Math.round(s.similarity * 100)}%)`).join('\n')

  return prompt
}

// ============================================
// Export
// ============================================

export default {
  uploadDocument,
  uploadFromUrl,
  searchKnowledge,
  getFullDocument,
  listKnowledgeDocuments,
  deleteDocument,
  getKnowledgeStats,
  buildKnowledgeContext,
  formatKnowledgeForPrompt,
}
