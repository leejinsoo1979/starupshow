/**
 * Slide Image Engine - 슬라이드 이미지 통합 서비스
 *
 * 슬라이드 콘텐츠를 분석하여 최적의 이미지 소스를 선택하고
 * 아이콘, 스톡 이미지, AI 생성 이미지를 자동으로 제공
 */

// 이미지 타입 정의
export type ImageType = 'ICON' | 'PHOTO' | 'CONCEPT' | 'CHART' | 'SPECIFIC' | 'NONE'

// 슬라이드 타입별 이미지 전략
export interface ImageStrategy {
  type: ImageType
  keywords: string[]
  source: 'icon' | 'stock' | 'ai' | 'chart'
  priority: number
}

// 이미지 결과
export interface SlideImageResult {
  type: ImageType
  source: string
  url: string
  base64?: string
  width: number
  height: number
  alt: string
  attribution?: string
}

// 슬라이드 콘텐츠 타입
export interface SlideContentInput {
  type: string
  title: string
  subtitle?: string
  content?: string[]
  keywords?: string[]
}

// 슬라이드 타입별 이미지 전략 매핑
const SLIDE_TYPE_STRATEGIES: Record<string, ImageStrategy> = {
  // 표지 - 추상적 개념 또는 브랜딩 이미지
  'cover': {
    type: 'CONCEPT',
    keywords: ['modern', 'professional', 'business'],
    source: 'ai',
    priority: 1,
  },

  // 문제 정의 - 아이콘 그리드
  'problem': {
    type: 'ICON',
    keywords: ['문제', '경고', '이슈'],
    source: 'icon',
    priority: 1,
  },

  // 솔루션 - 아이콘 + 스톡 이미지
  'solution': {
    type: 'ICON',
    keywords: ['솔루션', '해결', '아이디어'],
    source: 'icon',
    priority: 1,
  },

  // 시장 기회 - 차트/그래프
  'market': {
    type: 'CHART',
    keywords: ['시장', '성장', '데이터'],
    source: 'chart',
    priority: 1,
  },

  // 비즈니스 모델 - 아이콘 + 다이어그램
  'business-model': {
    type: 'ICON',
    keywords: ['비즈니스', '수익', '모델'],
    source: 'icon',
    priority: 1,
  },

  // 제품 - 스크린샷 또는 AI 생성
  'product': {
    type: 'PHOTO',
    keywords: ['제품', '앱', '서비스'],
    source: 'stock',
    priority: 1,
  },

  // 경쟁 분석 - 테이블/비교 아이콘
  'competition': {
    type: 'ICON',
    keywords: ['비교', '경쟁', '차별화'],
    source: 'icon',
    priority: 1,
  },

  // 팀 소개 - 사람 사진 (스톡)
  'team': {
    type: 'PHOTO',
    keywords: ['팀', '사람', '전문가'],
    source: 'stock',
    priority: 1,
  },

  // 로드맵 - 타임라인 아이콘
  'roadmap': {
    type: 'ICON',
    keywords: ['로드맵', '계획', '마일스톤'],
    source: 'icon',
    priority: 1,
  },

  // 재무 - 차트
  'financials': {
    type: 'CHART',
    keywords: ['재무', '매출', '수익'],
    source: 'chart',
    priority: 1,
  },

  // 투자 요청 - 성장 관련 이미지
  'investment': {
    type: 'CONCEPT',
    keywords: ['투자', '성장', '기회'],
    source: 'ai',
    priority: 1,
  },

  // 연락처 - 아이콘
  'contact': {
    type: 'ICON',
    keywords: ['연락', '이메일', '전화'],
    source: 'icon',
    priority: 1,
  },

  // 기본 콘텐츠
  'content': {
    type: 'ICON',
    keywords: ['정보', '콘텐츠'],
    source: 'icon',
    priority: 2,
  },
}

// 키워드 기반 이미지 타입 감지
const KEYWORD_TYPE_MAP: Record<string, ImageType> = {
  // 사람/팀 관련 → 스톡 사진
  '팀': 'PHOTO',
  '사람': 'PHOTO',
  '직원': 'PHOTO',
  '대표': 'PHOTO',
  'CEO': 'PHOTO',
  'CTO': 'PHOTO',
  '사무실': 'PHOTO',
  '회의': 'PHOTO',

  // 추상적 개념 → AI 생성
  '혁신': 'CONCEPT',
  '성장': 'CONCEPT',
  '연결': 'CONCEPT',
  '미래': 'CONCEPT',
  '기술': 'CONCEPT',
  '디지털': 'CONCEPT',
  '변환': 'CONCEPT',
  'AI': 'CONCEPT',

  // 기능/프로세스 → 아이콘
  '기능': 'ICON',
  '특징': 'ICON',
  '프로세스': 'ICON',
  '단계': 'ICON',
  '장점': 'ICON',
  '문제': 'ICON',
  '솔루션': 'ICON',

  // 데이터/수치 → 차트
  '데이터': 'CHART',
  '매출': 'CHART',
  '성장률': 'CHART',
  '시장': 'CHART',
  '통계': 'CHART',
  '%': 'CHART',

  // 특정 브랜드/로고 → 웹 검색
  '로고': 'SPECIFIC',
  '브랜드': 'SPECIFIC',
  '경쟁사': 'SPECIFIC',
}

/**
 * 슬라이드 콘텐츠 분석하여 이미지 타입 결정
 */
export function detectImageType(slide: SlideContentInput): ImageType {
  const allText = [
    slide.title,
    slide.subtitle || '',
    ...(slide.content || []),
    ...(slide.keywords || []),
  ].join(' ').toLowerCase()

  // 1. 슬라이드 타입으로 먼저 확인
  const strategy = SLIDE_TYPE_STRATEGIES[slide.type]
  if (strategy) {
    return strategy.type
  }

  // 2. 키워드 기반 타입 감지
  for (const [keyword, type] of Object.entries(KEYWORD_TYPE_MAP)) {
    if (allText.includes(keyword.toLowerCase())) {
      return type
    }
  }

  // 3. 기본값: 아이콘
  return 'ICON'
}

/**
 * 이미지 소스 결정
 */
export function getImageSource(type: ImageType): 'icon' | 'stock' | 'ai' | 'chart' | 'web' {
  switch (type) {
    case 'ICON':
      return 'icon'
    case 'PHOTO':
      return 'stock'
    case 'CONCEPT':
      return 'ai'
    case 'CHART':
      return 'chart'
    case 'SPECIFIC':
      return 'web'
    default:
      return 'icon'
  }
}

/**
 * 슬라이드에서 키워드 추출
 */
export function extractKeywords(slide: SlideContentInput): string[] {
  const allText = [
    slide.title,
    slide.subtitle || '',
    ...(slide.content || []),
  ].join(' ')

  // 한글 명사 추출 (간단한 방식)
  const koreanNouns = allText.match(/[가-힣]{2,}/g) || []

  // 영어 단어 추출
  const englishWords = allText.match(/[a-zA-Z]{3,}/g) || []

  // 중복 제거 및 상위 5개 반환
  const uniqueWords = [...new Set([...koreanNouns, ...englishWords])]
  return uniqueWords.slice(0, 5)
}

/**
 * 아이콘 가져오기
 */
export async function fetchIcons(
  keywords: string[],
  options: { size?: number; color?: string; count?: number } = {}
): Promise<SlideImageResult[]> {
  const { size = 64, color = '#4F46E5', count = 3 } = options

  const results: SlideImageResult[] = []

  for (const keyword of keywords.slice(0, count)) {
    try {
      const response = await fetch('/api/skills/icon-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, size, color, limit: 1 }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.icons?.[0]) {
          const icon = data.icons[0]
          results.push({
            type: 'ICON',
            source: `react-icons/${icon.library}`,
            url: icon.base64,
            base64: icon.base64,
            width: size,
            height: size,
            alt: keyword,
          })
        }
      }
    } catch (error) {
      console.error(`[SlideImageEngine] Icon fetch error for "${keyword}":`, error)
    }
  }

  return results
}

/**
 * 스톡 이미지 가져오기
 */
export async function fetchStockImages(
  keywords: string[],
  options: { count?: number; orientation?: string } = {}
): Promise<SlideImageResult[]> {
  const { count = 1, orientation = 'landscape' } = options

  try {
    const query = keywords.join(' ')
    const response = await fetch('/api/skills/image-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count, orientation }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.images) {
        return data.images.map((img: any) => ({
          type: 'PHOTO' as ImageType,
          source: img.source,
          url: img.url,
          width: img.width,
          height: img.height,
          alt: img.description || keywords.join(', '),
          attribution: `Photo by ${img.author}`,
        }))
      }
    }
  } catch (error) {
    console.error('[SlideImageEngine] Stock image fetch error:', error)
  }

  return []
}

/**
 * AI 이미지 생성
 */
export async function generateAIImage(
  prompt: string,
  options: { style?: string; aspectRatio?: string } = {}
): Promise<SlideImageResult | null> {
  const { style = 'digital_art', aspectRatio = '16:9' } = options

  try {
    // Z-Image (빠름) 먼저 시도
    const zImageResponse = await fetch('/api/skills/z-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Professional presentation slide image: ${prompt}. Modern, clean, business style.`,
        width: 1920,
        height: 1080,
      }),
    })

    if (zImageResponse.ok) {
      const data = await zImageResponse.json()
      if (data.success && data.image_url) {
        return {
          type: 'CONCEPT',
          source: 'z-image',
          url: data.image_url,
          width: 1920,
          height: 1080,
          alt: prompt,
        }
      }
    }

    // Nano Banana 폴백
    const nanoBananaResponse = await fetch('/api/skills/nano-banana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style, aspectRatio }),
    })

    if (nanoBananaResponse.ok) {
      const data = await nanoBananaResponse.json()
      if (data.success && data.image_url) {
        return {
          type: 'CONCEPT',
          source: 'nano-banana',
          url: data.image_url,
          base64: data.image_base64,
          width: 1920,
          height: 1080,
          alt: prompt,
        }
      }
    }
  } catch (error) {
    console.error('[SlideImageEngine] AI image generation error:', error)
  }

  return null
}

/**
 * 슬라이드용 이미지 가져오기 (통합 함수)
 */
export async function getImagesForSlide(
  slide: SlideContentInput,
  options: {
    iconColor?: string
    iconSize?: number
    preferredSource?: 'icon' | 'stock' | 'ai' | 'auto'
  } = {}
): Promise<SlideImageResult[]> {
  const { iconColor = '#4F46E5', iconSize = 64, preferredSource = 'auto' } = options

  // 이미지 타입 감지
  const imageType = detectImageType(slide)
  const keywords = extractKeywords(slide)

  console.log(`[SlideImageEngine] Processing slide "${slide.title}" - Type: ${imageType}, Keywords: ${keywords.join(', ')}`)

  // 소스 결정
  let source = preferredSource === 'auto' ? getImageSource(imageType) : preferredSource

  // 소스별 이미지 가져오기
  switch (source) {
    case 'icon':
      return await fetchIcons(keywords, { size: iconSize, color: iconColor })

    case 'stock':
      return await fetchStockImages(keywords)

    case 'ai':
      const aiImage = await generateAIImage(keywords.join(' '))
      return aiImage ? [aiImage] : []

    default:
      // 폴백: 아이콘
      return await fetchIcons(keywords, { size: iconSize, color: iconColor })
  }
}

/**
 * 전체 프레젠테이션에 이미지 추가
 */
export async function enrichPresentationWithImages(
  slides: SlideContentInput[],
  options: {
    iconColor?: string
    generateCoverImage?: boolean
    skipSlideTypes?: string[]
  } = {}
): Promise<Map<number, SlideImageResult[]>> {
  const {
    iconColor = '#4F46E5',
    generateCoverImage = true,
    skipSlideTypes = ['contact'],
  } = options

  const imageMap = new Map<number, SlideImageResult[]>()

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]

    // 스킵할 슬라이드 타입
    if (skipSlideTypes.includes(slide.type)) {
      continue
    }

    // 커버 슬라이드는 AI 이미지 생성
    if (slide.type === 'cover' && generateCoverImage) {
      const aiImage = await generateAIImage(slide.title)
      if (aiImage) {
        imageMap.set(i, [aiImage])
      }
      continue
    }

    // 일반 슬라이드
    const images = await getImagesForSlide(slide, { iconColor })
    if (images.length > 0) {
      imageMap.set(i, images)
    }
  }

  return imageMap
}

// 디자인 테마 색상
export const THEME_COLORS = {
  modern: { primary: '#4F46E5', secondary: '#10B981', accent: '#F59E0B' },
  corporate: { primary: '#1E3A8A', secondary: '#059669', accent: '#DC2626' },
  creative: { primary: '#7C3AED', secondary: '#EC4899', accent: '#06B6D4' },
  minimal: { primary: '#18181B', secondary: '#71717A', accent: '#3B82F6' },
  nature: { primary: '#166534', secondary: '#0369A1', accent: '#CA8A04' },
}

export type ThemeName = keyof typeof THEME_COLORS
