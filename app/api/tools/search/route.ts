/**
 * 웹 검색 API
 * Tavily를 사용하여 웹에서 정보를 검색합니다.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, maxResults = 5 } = body

    if (!query) {
      return NextResponse.json(
        { success: false, error: '검색어가 필요합니다' },
        { status: 400 }
      )
    }

    // Tavily API 키 확인
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'TAVILY_API_KEY가 설정되지 않았습니다',
      }, { status: 500 })
    }

    // Tavily 검색
    const { tavily } = await import('@tavily/core')
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY })

    const response = await client.search(query, {
      maxResults,
      includeAnswer: true,
      searchDepth: 'advanced' as const,
    })

    return NextResponse.json({
      success: true,
      query,
      answer: response.answer,
      results: response.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 500),
        score: r.score,
      })),
    })
  } catch (error: any) {
    console.error('[WebSearch API] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '검색 실패' },
      { status: 500 }
    )
  }
}

// GET도 지원 (query parameter 사용)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query') || searchParams.get('q')

  if (!query) {
    return NextResponse.json(
      { success: false, error: '검색어가 필요합니다 (?query=검색어)' },
      { status: 400 }
    )
  }

  // POST로 리다이렉트
  const fakeRequest = {
    json: async () => ({ query, maxResults: 5 }),
  } as NextRequest

  return POST(fakeRequest)
}
