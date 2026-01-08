import { NextRequest, NextResponse } from 'next/server'

/**
 * 웹 프록시 API
 * X-Frame-Options, CSP 헤더를 우회하여 모든 웹사이트를 iframe에 표시
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    // URL 유효성 검사
    const targetUrl = new URL(url)

    // 웹페이지 가져오기
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    const contentType = response.headers.get('content-type') || 'text/html'

    // HTML 콘텐츠인 경우
    if (contentType.includes('text/html')) {
      let html = await response.text()

      // Base URL 삽입 (상대 경로 리소스 로딩을 위해)
      const baseTag = `<base href="${targetUrl.origin}/" target="_blank">`

      // <head> 태그 뒤에 base 태그 삽입
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`)
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>${baseTag}`)
      } else {
        // head 태그가 없으면 html 시작 부분에 추가
        html = `${baseTag}${html}`
      }

      // 상대 경로를 절대 경로로 변환
      html = html
        // src="/path" → src="https://domain.com/path"
        .replace(/src="\//g, `src="${targetUrl.origin}/`)
        .replace(/src='\//g, `src='${targetUrl.origin}/`)
        // href="/path" → href="https://domain.com/path"
        .replace(/href="\//g, `href="${targetUrl.origin}/`)
        .replace(/href='\//g, `href='${targetUrl.origin}/`)
        // url(/path) → url(https://domain.com/path)
        .replace(/url\(\//g, `url(${targetUrl.origin}/`)
        .replace(/url\('\//g, `url('${targetUrl.origin}/`)
        .replace(/url\("\//g, `url("${targetUrl.origin}/`)

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // iframe 임베딩 허용
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': "frame-ancestors *",
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 기타 콘텐츠 (이미지, CSS 등)는 그대로 전달
    const buffer = await response.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch URL' },
      { status: 500 }
    )
  }
}
