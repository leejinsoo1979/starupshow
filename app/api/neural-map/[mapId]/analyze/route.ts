// @ts-nocheck
/**
 * Neural Map File Analysis API
 * POST: 파일 내용 분석하여 노드/엣지 자동 생성
 * - PDF: 텍스트 추출 후 AI 분석
 * - Markdown/Text: 파싱 후 AI 분석
 * - Image: 설명 기반 노드 생성
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// DEV 모드 설정
const DEV_MODE = process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true'
const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface RouteParams {
  params: Promise<{ mapId: string }>
}

interface ExtractedConcept {
  title: string
  summary: string
  type: 'concept' | 'idea' | 'decision' | 'task' | 'insight'
  tags: string[]
  importance: number
}

// PDF 텍스트 추출 (간단한 방식 - fetch하여 추출)
async function extractPdfText(url: string): Promise<string> {
  try {
    // PDF 파일 fetch
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch PDF')

    const arrayBuffer = await response.arrayBuffer()

    // unpdf 동적 import
    const { extractText, getDocumentProxy } = await import('unpdf')
    const data = new Uint8Array(arrayBuffer)
    const pdf = await getDocumentProxy(data)
    const result = await extractText(pdf, { mergePages: true })

    return result.text.slice(0, 10000) // 처음 10000자만 사용
  } catch (error) {
    console.error('PDF extraction error:', error)
    return ''
  }
}

// 마크다운/텍스트 추출
async function extractTextContent(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch text file')

    const text = await response.text()
    return text.slice(0, 10000) // 처음 10000자만 사용
  } catch (error) {
    console.error('Text extraction error:', error)
    return ''
  }
}

// AI를 통한 개념 추출
async function extractConceptsWithAI(
  content: string,
  fileName: string,
  fileType: string
): Promise<ExtractedConcept[]> {
  try {
    const prompt = `다음 ${fileType} 파일(${fileName})의 내용을 분석하여 핵심 개념들을 추출해주세요.

내용:
${content.slice(0, 5000)}

다음 JSON 형식으로 3-7개의 핵심 개념을 추출해주세요:
[
  {
    "title": "개념 제목 (짧고 명확하게)",
    "summary": "2-3문장 요약",
    "type": "concept|idea|decision|task|insight 중 하나",
    "tags": ["태그1", "태그2"],
    "importance": 1-10 중요도
  }
]

규칙:
- 문서의 핵심 주제와 하위 개념들을 파악
- 각 개념은 서로 관련되어 있어야 함
- 마인드맵처럼 중심에서 뻗어나가는 구조를 고려
- 한글로 작성

JSON만 반환해주세요:`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 문서 분석 전문가입니다. 문서에서 핵심 개념을 추출하여 마인드맵 노드로 만들어주세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content || '[]'

    // JSON 파싱
    try {
      const parsed = JSON.parse(responseText)
      // 배열이거나 concepts 프로퍼티가 있는 경우 처리
      const concepts = Array.isArray(parsed) ? parsed : (parsed.concepts || [])
      return concepts as ExtractedConcept[]
    } catch {
      console.error('Failed to parse AI response:', responseText)
      return []
    }
  } catch (error) {
    console.error('AI extraction error:', error)
    return []
  }
}

// POST /api/neural-map/[mapId]/analyze
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { mapId } = await params
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    let userId: string
    if (DEV_MODE) {
      userId = DEV_USER_ID
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    const body = await request.json()
    const { fileId } = body

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    // 파일 정보 조회
    const { data: file, error: fileError } = await adminSupabase
      .from('neural_files')
      .select('*')
      .eq('id', fileId)
      .eq('map_id', mapId)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileData = file as { id: string; name: string; type: string; url: string }

    // 파일 타입에 따른 내용 추출
    let content = ''

    if (fileData.type === 'pdf') {
      content = await extractPdfText(fileData.url)
    } else if (fileData.type === 'markdown') {
      content = await extractTextContent(fileData.url)
    } else if (fileData.type === 'image') {
      // 이미지는 파일명 기반으로 간단한 노드만 생성
      content = `이미지 파일: ${fileData.name}`
    } else if (fileData.type === 'video') {
      // 비디오는 파일명 기반으로 간단한 노드만 생성
      content = `비디오 파일: ${fileData.name}`
    }

    // 내용이 너무 짧으면 기본 노드만 생성
    if (content.length < 50) {
      return NextResponse.json({
        success: true,
        concepts: [],
        message: 'Content too short for analysis',
      })
    }

    // AI 분석으로 개념 추출
    const concepts = await extractConceptsWithAI(content, fileData.name, fileData.type)

    // 노드 및 엣지 생성
    const createdNodes: Array<{
      id: string
      type: string
      title: string
      summary: string
      tags: string[]
      importance: number
    }> = []
    const createdEdges: Array<{
      id: string
      source: string
      target: string
      type: string
    }> = []

    // 먼저 파일 노드 ID 찾기 (파일명으로 검색)
    const { data: existingNodes } = await adminSupabase
      .from('neural_nodes')
      .select('id')
      .eq('map_id', mapId)
      .eq('title', fileData.name)
      .single()

    const parentNodeId = existingNodes?.id

    // 각 개념을 노드로 생성
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i]

      // 노드 생성
      const { data: node, error: nodeError } = await adminSupabase
        .from('neural_nodes')
        .insert({
          map_id: mapId,
          type: concept.type,
          title: concept.title,
          summary: concept.summary,
          tags: concept.tags,
          importance: concept.importance,
          parent_id: parentNodeId || null,
          expanded: true,
          pinned: false,
        })
        .select()
        .single()

      if (nodeError) {
        console.error('Node creation error:', nodeError)
        continue
      }

      const nodeData = node as { id: string; type: string; title: string; summary: string; tags: string[]; importance: number }
      createdNodes.push(nodeData)

      // 부모 노드가 있으면 엣지 생성
      if (parentNodeId) {
        const { data: edge, error: edgeError } = await adminSupabase
          .from('neural_edges')
          .insert({
            map_id: mapId,
            source: parentNodeId,
            target: nodeData.id,
            type: 'parent_child',
            weight: 0.8,
            bidirectional: false,
          })
          .select()
          .single()

        if (!edgeError && edge) {
          const edgeData = edge as { id: string; source: string; target: string; type: string }
          createdEdges.push(edgeData)
        }
      }
    }

    // 개념 간 연결 (같은 태그가 있으면 연결)
    for (let i = 0; i < createdNodes.length; i++) {
      for (let j = i + 1; j < createdNodes.length; j++) {
        const node1 = createdNodes[i]
        const node2 = createdNodes[j]

        // 태그 중복 확인
        const commonTags = node1.tags.filter(t => node2.tags.includes(t))

        if (commonTags.length > 0) {
          const { data: edge } = await adminSupabase
            .from('neural_edges')
            .insert({
              map_id: mapId,
              source: node1.id,
              target: node2.id,
              type: 'same_topic',
              weight: 0.5 + (commonTags.length * 0.1),
              bidirectional: true,
              label: commonTags[0],
            })
            .select()
            .single()

          if (edge) {
            const edgeData = edge as { id: string; source: string; target: string; type: string }
            createdEdges.push(edgeData)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      concepts: concepts,
      nodes: createdNodes.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        summary: n.summary,
        tags: n.tags,
        importance: n.importance,
        expanded: true,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      edges: createdEdges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        weight: 0.7,
        bidirectional: false,
        createdAt: new Date().toISOString(),
      })),
    })
  } catch (err) {
    console.error('Analyze POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
