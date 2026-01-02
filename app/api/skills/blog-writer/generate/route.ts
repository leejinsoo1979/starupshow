import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDevMode, DEV_USER } from '@/lib/dev-user'

/**
 * AI 블로그 글 생성 API
 *
 * 1. 키워드로 네이버/구글에서 상위 3개 글 수집
 * 2. AI가 분석하여 SEO 최적화된 글 작성
 */

interface GenerateRequest {
  keyword: string
  platform: 'tistory' | 'naver'
  style?: 'info' | 'review' | 'story' | 'list'
  toneStyle?: 'haeyo' | 'formal' | 'casual'  // 말투 스타일
  collectTop3?: boolean
  includeImages?: boolean
  imageCount?: number  // 기본값 3
  imageStyle?: 'realistic' | 'artistic' | 'digital_art' | 'photography'
}

interface GeneratedImage {
  url: string
  prompt: string
  position: number  // 콘텐츠에서 삽입될 위치 (문단 인덱스)
}

// OpenAI DALL-E 이미지 생성
async function generateBlogImage(prompt: string, style: string = 'photography'): Promise<string | null> {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    if (!OPENAI_API_KEY) {
      console.error('[BlogWriter] OPENAI_API_KEY가 설정되지 않았습니다.')
      return null
    }

    // 스타일 프리픽스 추가
    const styleMap: Record<string, string> = {
      'realistic': 'photorealistic, ultra detailed, 8k resolution, ',
      'artistic': 'artistic painting style, creative, expressive, ',
      'digital_art': 'digital art, concept art, vibrant colors, ',
      'photography': 'professional DSLR photography, high quality, ',
    }
    const enhancedPrompt = (styleMap[style] || styleMap['photography']) + prompt + '. No text or letters in the image.'

    console.log('[BlogWriter] Generating image with DALL-E:', enhancedPrompt.slice(0, 100) + '...')

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[BlogWriter] DALL-E API error:', response.status, errorText)
      return null
    }

    const result = await response.json()
    const imageData = result.data?.[0]?.b64_json

    if (imageData) {
      const imageUrl = `data:image/png;base64,${imageData}`
      console.log('[BlogWriter] Image generated successfully with DALL-E')
      return imageUrl
    }

    console.error('[BlogWriter] No image in DALL-E response')
    return null
  } catch (error) {
    console.error('[BlogWriter] Image generation error:', error)
    return null
  }
}

// 콘텐츠에서 이미지 프롬프트 추출
async function extractImagePrompts(keyword: string, content: string, count: number = 3): Promise<string[]> {
  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `블로그 글의 내용을 분석하여 ${count}개의 이미지 생성 프롬프트를 만들어라.
각 프롬프트는 블로그 글의 다른 부분을 시각화해야 한다.
프롬프트는 영어로 작성하고, 구체적이고 시각적으로 묘사해야 한다.
텍스트나 글자가 들어가지 않는 이미지여야 한다.

응답 형식 (각 줄에 하나씩):
IMAGE1: [영어 프롬프트]
IMAGE2: [영어 프롬프트]
IMAGE3: [영어 프롬프트]`
        },
        {
          role: 'user',
          content: `키워드: ${keyword}\n\n블로그 내용:\n${content.slice(0, 2000)}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })

    const result = response.choices[0]?.message?.content || ''
    const prompts: string[] = []

    for (let i = 1; i <= count; i++) {
      const match = result.match(new RegExp(`IMAGE${i}:\\s*(.+?)(?=IMAGE\\d:|$)`, 's'))
      if (match) {
        prompts.push(match[1].trim())
      }
    }

    // 프롬프트가 부족하면 기본 프롬프트 추가
    while (prompts.length < count) {
      prompts.push(`Beautiful and aesthetic image related to ${keyword}, professional photography, high quality`)
    }

    return prompts
  } catch (error) {
    console.error('[BlogWriter] Failed to extract image prompts:', error)
    // 기본 프롬프트 반환
    return Array(count).fill(`Beautiful and aesthetic image related to ${keyword}, professional photography`)
  }
}

// 콘텐츠에 이미지 삽입
function insertImagesIntoContent(content: string, images: string[]): string {
  if (images.length === 0) return content

  // 문단으로 분리
  const paragraphs = content.split('\n\n').filter(p => p.trim())

  if (paragraphs.length < 2) {
    // 문단이 적으면 끝에 이미지 추가
    return content + '\n\n' + images.map(img => `[IMAGE:${img}]`).join('\n\n')
  }

  // 이미지 삽입 위치 계산 (균등 분배)
  const result: string[] = []
  const imagePositions: number[] = []

  // 첫 번째 이미지: 첫 문단 뒤
  // 두 번째 이미지: 중간
  // 세 번째 이미지: 마지막 문단 전
  const positions = [
    Math.floor(paragraphs.length * 0.2),   // 20% 위치
    Math.floor(paragraphs.length * 0.5),   // 50% 위치
    Math.floor(paragraphs.length * 0.8),   // 80% 위치
  ]

  let imageIndex = 0
  for (let i = 0; i < paragraphs.length; i++) {
    result.push(paragraphs[i])

    if (imageIndex < images.length && i === positions[imageIndex]) {
      result.push(`[IMAGE:${images[imageIndex]}]`)
      imageIndex++
    }
  }

  // 남은 이미지 추가
  while (imageIndex < images.length) {
    result.push(`[IMAGE:${images[imageIndex]}]`)
    imageIndex++
  }

  return result.join('\n\n')
}

// 네이버 블로그 검색 (상위 3개 글 수집)
async function collectTopPosts(keyword: string): Promise<string[]> {
  const naverClientId = process.env.NAVER_CLIENT_ID
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET

  if (!naverClientId || !naverClientSecret) {
    console.warn('[BlogWriter] Naver API credentials not found, skipping collection')
    return []
  }

  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=3&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': naverClientId,
          'X-Naver-Client-Secret': naverClientSecret,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Naver API error: ${response.status}`)
    }

    const data = await response.json()
    const posts: string[] = []

    for (const item of data.items || []) {
      // HTML 태그 제거
      const title = item.title?.replace(/<[^>]*>/g, '') || ''
      const description = item.description?.replace(/<[^>]*>/g, '') || ''
      posts.push(`제목: ${title}\n내용: ${description}`)
    }

    return posts
  } catch (error) {
    console.error('[BlogWriter] Error collecting top posts:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateRequest = await request.json()
    const {
      keyword,
      platform,
      style = 'info',
      toneStyle = 'haeyo',
      collectTop3 = true,
      includeImages = false,
      imageCount = 3,
      imageStyle = 'photography'
    } = body

    if (!keyword?.trim()) {
      return NextResponse.json(
        { error: '키워드가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('[BlogWriter] Generating blog post:', { keyword, platform, style, toneStyle, collectTop3 })

    // 상위 글 수집
    let topPostsContext = ''
    if (collectTop3) {
      const topPosts = await collectTopPosts(keyword)
      if (topPosts.length > 0) {
        topPostsContext = `
아래는 "${keyword}" 키워드로 상위 노출된 블로그 글들입니다. 이 글들의 구조와 내용을 참고하되, 완전히 새로운 글을 작성해주세요:

---
${topPosts.join('\n\n---\n\n')}
---
`
      }
    }

    // AI로 글 생성
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 스타일별 프롬프트 정의
    const stylePrompts: Record<string, string> = {
      info: `정보형 글을 작성한다.
- 주제에 대해 깊이 있게 파고든다
- 독자가 궁금해할 만한 내용을 예상하고 답한다
- 배경 지식부터 차근차근 설명한다
- 왜 그런지 이유와 맥락을 함께 전달한다`,

      review: `후기형 글을 작성한다.
- 실제로 써본 사람처럼 디테일하게
- 기대했던 것과 실제 차이점
- 아쉬운 점도 솔직하게
- 어떤 사람에게 맞는지 구체적으로`,

      story: `이야기형 글을 작성한다.
- 소설처럼 장면을 그린다
- 감정과 분위기를 담는다
- 시간 순서대로 자연스럽게 전개
- 읽는 사람이 같이 경험하는 느낌으로`,

      list: `목록형 글을 작성한다.
- 핵심만 뽑아서 정리
- 각 항목별로 왜 좋은지 설명
- 순위나 우선순위가 있다면 표시
- 한눈에 비교할 수 있게`
    }

    // 말투 스타일별 규칙
    const toneRules: Record<string, string> = {
      haeyo: `말투 규칙 (가장 중요):
- 친구한테 말하듯이 편하게 써야 해
- "~해요", "~거든요", "~네요", "~죠", "~더라고요" 이런 말투로
- "~입니다", "~습니다"는 절대 금지. 뉴스 기자처럼 쓰면 안 돼
- 예시: "이게 진짜 괜찮더라고요" (O) / "이것은 괜찮습니다" (X)
- 예시: "근데 이 부분은 좀 아쉬웠어요" (O) / "그러나 이 부분은 아쉽습니다" (X)
- 예시: "솔직히 처음엔 별로였거든요" (O) / "처음에는 좋지 않았습니다" (X)`,

      formal: `말투 규칙 (가장 중요):
- 격식 있는 ~습니다체를 사용해야 합니다
- "~입니다", "~습니다", "~됩니다" 형태로 문장을 마무리합니다
- 공식적이고 신뢰감 있는 톤을 유지합니다
- 예시: "이 제품은 매우 우수합니다" (O) / "이거 진짜 좋아요" (X)
- 예시: "다음과 같은 장점이 있습니다" (O) / "이런 장점이 있거든요" (X)
- 예시: "추천드립니다" (O) / "추천해요" (X)`,

      casual: `말투 규칙 (가장 중요):
- 친한 친구에게 말하듯 반말을 사용해
- "~해", "~야", "~거든", "~잖아", "~지" 이런 말투로
- 가장 편하고 자연스러운 구어체를 사용해
- 예시: "이거 진짜 괜찮더라" (O) / "이것은 괜찮습니다" (X)
- 예시: "근데 이건 좀 별로야" (O) / "그러나 이것은 아쉽습니다" (X)
- 예시: "솔직히 처음엔 별로였거든" (O) / "처음에는 좋지 않았습니다" (X)`
    }

    const baseRules = `
${toneRules[toneStyle] || toneRules.haeyo}

작성 원칙:
- 책을 쓰듯이 깊이 있게 작성한다
- 글쓴이의 생각과 관점이 드러나야 한다
- 읽는 사람이 빠져들 수 있는 글
- 중간중간 질문도 던지기 ("그럼 어떻게 해야 할까요?")

금지 사항:
- 이모티콘, 이모지 금지
- ##, ### 마크다운 기호 금지
- **굵은글씨** 금지
- "안녕하세요" 인사말 금지

분량: 2500-3500자`

    // 말투 스타일별 시스템 프롬프트
    const toneSystemPrompts: Record<string, string> = {
      haeyo: `너는 친근한 블로거야. 뉴스 기자처럼 딱딱하게 쓰면 절대 안 돼.
독자랑 대화하듯이 편하게 써. "~해요", "~거든요", "~네요" 말투를 써.
"~입니다", "~습니다"는 쓰지 마. 이건 진짜 중요해.`,
      formal: `너는 전문적인 블로거야. 신뢰감 있는 격식체로 작성해.
"~입니다", "~습니다", "~됩니다" 형태로 문장을 마무리해.
공식적이면서도 읽기 쉬운 톤을 유지해.`,
      casual: `너는 친한 친구같은 블로거야. 반말로 자연스럽게 써.
"~해", "~야", "~거든", "~잖아" 이런 말투를 써.
딱딱한 존댓말은 쓰지 마. 편하게 대화하듯이 써.`
    }

    const systemPrompt = `${toneSystemPrompts[toneStyle] || toneSystemPrompts.haeyo}

${stylePrompts[style] || stylePrompts.info}

${baseRules}`

    const userPrompt = `"${keyword}" 주제로 블로그 글을 써주세요.

${topPostsContext}

응답 형식:
TITLE: (클릭하고 싶은 매력적인 제목)
TAGS: (관련 태그 5-7개, 쉼표 구분)
CONTENT:
(본문 내용 - 순수 텍스트만, 마크다운 기호 없이)`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.8,
    })

    const content = response.choices[0]?.message?.content || ''

    // 응답 파싱
    const titleMatch = content.match(/TITLE:\s*(.+?)(?=\nTAGS:|$)/s)
    const tagsMatch = content.match(/TAGS:\s*(.+?)(?=\nCONTENT:|$)/s)
    const contentMatch = content.match(/CONTENT:\s*([\s\S]+)$/)

    const title = titleMatch?.[1]?.trim() || `${keyword} 완벽 가이드`
    const tags = tagsMatch?.[1]?.split(',').map(t => t.trim()).filter(Boolean) || [keyword]
    let blogContent = contentMatch?.[1]?.trim() || content

    // 이미지 생성 (옵션 활성화시)
    const generatedImages: string[] = []
    if (includeImages) {
      console.log('[BlogWriter] Generating images with nano-banana...')

      // 이미지 프롬프트 추출
      const imagePrompts = await extractImagePrompts(keyword, blogContent, imageCount)
      console.log('[BlogWriter] Image prompts:', imagePrompts)

      // 병렬로 이미지 생성
      const imagePromises = imagePrompts.map(prompt =>
        generateBlogImage(prompt, imageStyle)
      )

      const imageResults = await Promise.all(imagePromises)

      for (const imageUrl of imageResults) {
        if (imageUrl) {
          generatedImages.push(imageUrl)
        }
      }

      console.log('[BlogWriter] Generated images:', generatedImages.length)

      // 콘텐츠에 이미지 삽입
      if (generatedImages.length > 0) {
        blogContent = insertImagesIntoContent(blogContent, generatedImages)
      }
    }

    console.log('[BlogWriter] Generated successfully:', {
      titleLength: title.length,
      tagsCount: tags.length,
      contentLength: blogContent.length,
      imageCount: generatedImages.length
    })

    return NextResponse.json({
      success: true,
      title,
      tags,
      content: blogContent,
      images: generatedImages,
      platform,
      keyword,
      toneStyle,
    })

  } catch (error: any) {
    console.error('[BlogWriter] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate blog post' },
      { status: 500 }
    )
  }
}
