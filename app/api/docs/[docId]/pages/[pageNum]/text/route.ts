export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDevUserIfEnabled } from '@/lib/dev-user'
import { createClient } from '@/lib/supabase/server'
// unpdf for PDF parsing (Node.js compatible)
import { extractText, getDocumentProxy } from 'unpdf'

/**
 * PDF 페이지별 텍스트 추출 API
 * GET /api/docs/:docId/pages/:pageNum/text
 *
 * Session Room v2 - 에이전트가 PDF의 특정 페이지 텍스트를 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string; pageNum: string } }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 인증 확인
    const devUser = getDevUserIfEnabled()
    let user: any = null

    if (devUser) {
      user = devUser
    } else {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = authUser
    }

    const { docId, pageNum } = params
    const pageNumber = parseInt(pageNum)

    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
    }

    // shared_viewer_state에서 PDF 정보 조회
    const { data: viewerState, error: viewerError } = await (adminClient
      .from('shared_viewer_state') as any)
      .select('*')
      .eq('id', docId)
      .single()

    if (viewerError || !viewerState) {
      // docId가 room_id인 경우 시도
      const { data: viewerByRoom } = await (adminClient
        .from('shared_viewer_state') as any)
        .select('*')
        .eq('room_id', docId)
        .single()

      if (!viewerByRoom) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      // room_id로 찾은 경우
      if (viewerByRoom.media_type !== 'pdf') {
        return NextResponse.json({ error: 'Document is not a PDF' }, { status: 400 })
      }

      return await extractPdfPageText(viewerByRoom.media_url, pageNumber, viewerByRoom.media_name)
    }

    if (viewerState.media_type !== 'pdf') {
      return NextResponse.json({ error: 'Document is not a PDF' }, { status: 400 })
    }

    return await extractPdfPageText(viewerState.media_url, pageNumber, viewerState.media_name)
  } catch (error) {
    console.error('[PDF Text API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PDF URL에서 특정 페이지 텍스트 추출
 */
async function extractPdfPageText(
  pdfUrl: string,
  pageNumber: number,
  fileName: string
): Promise<NextResponse> {
  try {
    // PDF 다운로드
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 502 })
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    // unpdf로 텍스트 추출
    const pdfData = new Uint8Array(pdfBuffer)
    const pdf = await getDocumentProxy(pdfData)
    const result = await extractText(pdf, { mergePages: false })

    // unpdf는 페이지별 배열로 텍스트를 반환
    const pages = Array.isArray(result.text) ? result.text : [result.text]
    const numPages = pdf.numPages

    // 페이지가 범위를 벗어난 경우
    if (pageNumber > numPages) {
      return NextResponse.json({
        error: 'Page number out of range',
        total_pages: numPages
      }, { status: 400 })
    }

    // 요청한 페이지 텍스트 추출 (0-indexed)
    const pageIndex = pageNumber - 1
    const pageText = pages[pageIndex] || ''

    return NextResponse.json({
      doc_name: fileName,
      page: pageNumber,
      total_pages: numPages,
      text: pageText.trim(),
      // Evidence 형식 힌트
      evidence_format: `[Evidence: ${fileName} p.${pageNumber} "인용문"]`,
    })
  } catch (parseError: any) {
    console.error('[PDF Text API] Parse error:', parseError)
    return NextResponse.json({
      error: 'Failed to parse PDF',
      details: parseError.message
    }, { status: 500 })
  }
}
