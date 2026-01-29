/**
 * Image Service - 서버 사이드에서 직접 이미지 검색
 *
 * API 라우트에서 다른 API를 fetch하는 대신 직접 함수 호출
 * Unsplash, Pexels, Tavily 지원
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const TAVILY_API_KEY = process.env.TAVILY_API_KEY

// 한글 → 영어 키워드 매핑 (이미지 검색용)
const KEYWORD_TRANSLATION: Record<string, string> = {
  // 비즈니스
  '비즈니스': 'business',
  '사무실': 'office',
  '회의': 'meeting',
  '팀': 'team',
  '협업': 'collaboration',
  '스타트업': 'startup',
  '투자': 'investment',
  '금융': 'finance',
  '성장': 'growth',
  '성공': 'success',
  '리더십': 'leadership',
  '전략': 'strategy',
  '마케팅': 'marketing',

  // 기술
  '기술': 'technology',
  '컴퓨터': 'computer',
  '데이터': 'data',
  '인공지능': 'artificial intelligence',
  'AI': 'artificial intelligence',
  '클라우드': 'cloud computing',
  '서버': 'server',
  '코딩': 'coding',
  '개발': 'software development',
  '앱': 'mobile app',
  '웹사이트': 'website',
  '네트워크': 'network',
  '보안': 'cybersecurity',

  // 일반
  '자연': 'nature',
  '도시': 'city',
  '건물': 'building',
  '사람들': 'people',
  '풍경': 'landscape',
  '추상': 'abstract',
  '배경': 'background',
  '패턴': 'pattern',
  '미니멀': 'minimal',
  '모던': 'modern',
  '창의적': 'creative',
  '혁신': 'innovation',
  '미래': 'futuristic',
}

// 키워드 번역 함수
function translateKeyword(keyword: string): string {
  // 이미 영어인 경우 그대로 반환
  if (/^[a-zA-Z\s]+$/.test(keyword)) {
    return keyword
  }

  // 한글 키워드 번역
  if (KEYWORD_TRANSLATION[keyword]) {
    return KEYWORD_TRANSLATION[keyword]
  }

  // 부분 일치 검색
  for (const [kor, eng] of Object.entries(KEYWORD_TRANSLATION)) {
    if (keyword.includes(kor)) {
      return keyword.replace(kor, eng)
    }
  }

  // 번역 실패 시 원본 반환
  return keyword
}

export interface ImageResult {
  id: string
  url: string
  thumbnailUrl: string
  width: number
  height: number
  description: string
  author: string
  authorUrl: string
  source: string
  downloadUrl?: string
}

export interface ImageSearchOptions {
  source?: 'unsplash' | 'pexels' | 'web' | 'auto'
  count?: number
  orientation?: 'landscape' | 'portrait' | 'squarish'
}

// Unsplash API 검색
async function searchUnsplash(
  query: string,
  count: number,
  orientation?: string
): Promise<ImageResult[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('[ImageService] Unsplash API key not configured')
    return []
  }

  try {
    const params = new URLSearchParams({
      query: translateKeyword(query),
      per_page: count.toString(),
      ...(orientation && { orientation }),
    })

    const response = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`)
    }

    const data = await response.json()

    return data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      width: photo.width,
      height: photo.height,
      description: photo.description || photo.alt_description || '',
      author: photo.user.name,
      authorUrl: photo.user.links.html,
      source: 'unsplash',
      downloadUrl: photo.links.download,
    }))
  } catch (error) {
    console.error('[ImageService] Unsplash error:', error)
    return []
  }
}

// Pexels API 검색
async function searchPexels(
  query: string,
  count: number,
  orientation?: string
): Promise<ImageResult[]> {
  if (!PEXELS_API_KEY) {
    console.warn('[ImageService] Pexels API key not configured')
    return []
  }

  try {
    const params = new URLSearchParams({
      query: translateKeyword(query),
      per_page: count.toString(),
      ...(orientation && { orientation }),
    })

    const response = await fetch(
      `https://api.pexels.com/v1/search?${params}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`)
    }

    const data = await response.json()

    return data.photos.map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.src.large,
      thumbnailUrl: photo.src.small,
      width: photo.width,
      height: photo.height,
      description: photo.alt || '',
      author: photo.photographer,
      authorUrl: photo.photographer_url,
      source: 'pexels',
      downloadUrl: photo.src.original,
    }))
  } catch (error) {
    console.error('[ImageService] Pexels error:', error)
    return []
  }
}

// Tavily 웹 이미지 검색 (백업)
async function searchWebImages(
  query: string,
  count: number
): Promise<ImageResult[]> {
  if (!TAVILY_API_KEY) {
    console.warn('[ImageService] Tavily API key not configured')
    return []
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `${translateKeyword(query)} high quality image`,
        search_depth: 'basic',
        include_images: true,
        max_results: count,
      }),
    })

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`)
    }

    const data = await response.json()

    return (data.images || []).slice(0, count).map((url: string, i: number) => ({
      id: `web-${i}`,
      url,
      thumbnailUrl: url,
      width: 1200,
      height: 800,
      description: query,
      author: 'Web',
      authorUrl: '',
      source: 'web',
    }))
  } catch (error) {
    console.error('[ImageService] Tavily error:', error)
    return []
  }
}

/**
 * 이미지 검색 (서버 사이드 직접 호출)
 */
export async function searchImages(
  query: string,
  options: ImageSearchOptions = {}
): Promise<ImageResult[]> {
  const { source = 'auto', count = 5, orientation = 'landscape' } = options

  console.log(`[ImageService] 🔍 Searching images for: "${query}" (source: ${source})`)

  let images: ImageResult[] = []

  // 소스별 검색
  switch (source) {
    case 'unsplash':
      images = await searchUnsplash(query, count, orientation)
      break

    case 'pexels':
      images = await searchPexels(query, count, orientation)
      break

    case 'web':
      images = await searchWebImages(query, count)
      break

    case 'auto':
    default:
      // 우선순위: Unsplash → Pexels → Web
      images = await searchUnsplash(query, count, orientation)

      if (images.length < count) {
        const pexelsImages = await searchPexels(query, count - images.length, orientation)
        images = [...images, ...pexelsImages]
      }

      if (images.length < count) {
        const webImages = await searchWebImages(query, count - images.length)
        images = [...images, ...webImages]
      }
      break
  }

  console.log(`[ImageService] ✅ Found ${images.length} images for "${query}"`)

  return images
}

/**
 * 단일 이미지 검색 (슬라이드 디자이너용)
 */
export async function searchSingleImage(
  query: string,
  orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'
): Promise<ImageResult | null> {
  const images = await searchImages(query, { count: 1, orientation })
  return images[0] || null
}

/**
 * 슬라이드용 이미지 검색 인터페이스
 */
export interface SlideImageResult {
  url: string
  position: string
  width: number
  height: number
  alt: string
  source: string
}

/**
 * 슬라이드 이미지 검색 (slide-designer 호환)
 */
export async function fetchSlideImage(
  query: string,
  orientation: string = 'landscape'
): Promise<SlideImageResult | null> {
  const image = await searchSingleImage(query, orientation as any)

  if (image) {
    return {
      url: image.url,
      position: 'right',
      width: image.width,
      height: image.height,
      alt: image.description || query,
      source: image.source,
    }
  }

  return null
}
