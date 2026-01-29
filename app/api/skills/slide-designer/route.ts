/**
 * Slide Designer API - 전문가 수준 슬라이드 생성 통합 스킬
 *
 * 기능:
 * - 디자인 원칙 기반 슬라이드 구조화
 * - 아이콘 자동 매칭 (react-icons)
 * - 스톡 이미지 검색 (Unsplash/Pexels)
 * - AI 이미지 생성 (Nano Banana/Z-Image)
 * - 프로페셔널 레이아웃 템플릿
 */

// Force Node.js runtime for react-dom/server support (via icon-service)
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { searchIcons } from '@/lib/slide-engine/icon-service'
import { fetchSlideImage } from '@/lib/slide-engine/image-service'
import { generateSlideContent } from '@/lib/slide-engine/content-service'

// 디자인 원칙 20가지 (NotebookLM 스타일)
const DESIGN_PRINCIPLES = `
## 슬라이드 디자인 원칙 20가지

### 시각적 계층구조
1. 제목은 화면의 1/3 이상 차지 금지, 좌상단 또는 중앙 고정
2. 핵심 메시지는 반드시 가장 큰 폰트 (Hero Text)
3. 한 슬라이드에 핵심 포인트 최대 3개 (Rule of Three)
4. 여백은 콘텐츠의 30% 이상 확보 (Breathing Room)
5. 시선 흐름: Z-패턴 또는 F-패턴 준수

### 타이포그래피
6. 폰트 크기는 3단계만: 제목(32+pt), 본문(20-24pt), 캡션(14-16pt)
7. 제목과 본문의 크기 비율은 1.5:1 이상
8. 한 줄에 최대 8-10단어 (가독성)
9. 불릿 포인트보다 아이콘+텍스트 조합 선호

### 컬러 & 이미지
10. 메인 컬러 1개 + 강조 컬러 1개 + 중립색
11. 배경 이미지 사용 시 반드시 오버레이 (60-80% 불투명도)
12. 차트/그래프는 최대 5개 데이터 포인트
13. 이미지는 좌우 분할 레이아웃에서 50% 이상

### 레이아웃 패턴
14. 표지: 센터 정렬, 대형 제목, 미니멀
15. 문제 정의: 아이콘 그리드 (3열) 또는 큰 숫자 강조
16. 솔루션: Before/After 또는 3-Step 플로우
17. 데이터: 한 개의 핵심 숫자 크게 + 맥락 설명 작게
18. 팀 소개: 원형 사진 + 2줄 설명

### 금지 사항
19. 슬라이드를 텍스트로 가득 채우지 않음
20. 발표자 노트에 들어갈 내용을 슬라이드에 넣지 않음
`

// 슬라이드 타입별 레이아웃 규칙
const LAYOUT_RULES: Record<string, LayoutRule> = {
  cover: {
    name: '표지',
    layout: 'center',
    elements: ['title', 'subtitle', 'tagline', 'background_image'],
    imagePosition: 'background',
    iconCount: 0,
    textMaxWords: 20,
    design: '제목 중앙 정렬, 그라데이션 또는 이미지 배경',
  },
  problem: {
    name: '문제 정의',
    layout: 'icon-grid-3col',
    elements: ['section_title', 'issues_grid', 'stats'],
    imagePosition: 'icons',
    iconCount: 3,
    textMaxWords: 50,
    design: '3열 아이콘 그리드, 각 문제점에 아이콘 + 제목 + 설명',
  },
  solution: {
    name: '솔루션',
    layout: 'split-left-text',
    elements: ['section_title', 'features', 'visual'],
    imagePosition: 'right',
    iconCount: 3,
    textMaxWords: 60,
    design: '좌측 텍스트/기능, 우측 이미지 또는 아이콘',
  },
  market: {
    name: '시장 기회',
    layout: 'data-centered',
    elements: ['section_title', 'tam_sam_som', 'growth_rate'],
    imagePosition: 'chart',
    iconCount: 0,
    textMaxWords: 30,
    design: 'TAM/SAM/SOM 차트 중앙, 핵심 수치 강조',
  },
  'business-model': {
    name: '비즈니스 모델',
    layout: 'pricing-grid',
    elements: ['section_title', 'pricing_tiers', 'metrics'],
    imagePosition: 'icons',
    iconCount: 3,
    textMaxWords: 80,
    design: '3열 가격 카드, 각 티어별 기능 목록',
  },
  team: {
    name: '팀 소개',
    layout: 'team-grid',
    elements: ['section_title', 'team_members'],
    imagePosition: 'photos',
    iconCount: 0,
    textMaxWords: 60,
    design: '원형 프로필 사진 + 이름 + 역할 + 경력',
  },
  roadmap: {
    name: '로드맵',
    layout: 'timeline',
    elements: ['section_title', 'milestones'],
    imagePosition: 'icons',
    iconCount: 4,
    textMaxWords: 40,
    design: '수평 타임라인, 각 마일스톤에 아이콘',
  },
  investment: {
    name: '투자 요청',
    layout: 'data-grid-3col',
    elements: ['section_title', 'investment_info', 'use_of_funds'],
    imagePosition: 'icons',
    iconCount: 3,
    textMaxWords: 40,
    design: '라운드/금액/밸류에이션 3열 카드',
  },
  contact: {
    name: '연락처',
    layout: 'center',
    elements: ['thank_you', 'contact_info'],
    imagePosition: 'icons',
    iconCount: 3,
    textMaxWords: 20,
    design: 'Thank You 큰 텍스트 + 연락처 아이콘 목록',
  },
  content: {
    name: '일반 콘텐츠',
    layout: 'split-left-text',
    elements: ['section_title', 'content_points', 'visual'],
    imagePosition: 'right',
    iconCount: 1,
    textMaxWords: 60,
    design: '좌측 텍스트, 우측 이미지 또는 아이콘',
  },
}

interface LayoutRule {
  name: string
  layout: string
  elements: string[]
  imagePosition: 'background' | 'icons' | 'right' | 'left' | 'chart' | 'photos' | 'center'
  iconCount: number
  textMaxWords: number
  design: string
}

// 테마 정의
const THEMES = {
  modern: {
    name: 'Modern',
    colors: {
      primary: '#4F46E5',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#18181B',
      text: '#FFFFFF',
      muted: '#71717A',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
  },
  corporate: {
    name: 'Corporate',
    colors: {
      primary: '#1E40AF',
      secondary: '#059669',
      accent: '#DC2626',
      background: '#FFFFFF',
      text: '#1F2937',
      muted: '#6B7280',
    },
    fonts: {
      heading: 'Arial',
      body: 'Arial',
    },
  },
  creative: {
    name: 'Creative',
    colors: {
      primary: '#7C3AED',
      secondary: '#EC4899',
      accent: '#06B6D4',
      background: '#0F172A',
      text: '#F8FAFC',
      muted: '#94A3B8',
    },
    fonts: {
      heading: 'Poppins',
      body: 'Poppins',
    },
  },
  minimal: {
    name: 'Minimal',
    colors: {
      primary: '#18181B',
      secondary: '#3B82F6',
      accent: '#EAB308',
      background: '#FAFAFA',
      text: '#18181B',
      muted: '#A1A1AA',
    },
    fonts: {
      heading: 'Helvetica',
      body: 'Helvetica',
    },
  },
  nature: {
    name: 'Nature',
    colors: {
      primary: '#166534',
      secondary: '#0369A1',
      accent: '#CA8A04',
      background: '#F0FDF4',
      text: '#14532D',
      muted: '#6B7280',
    },
    fonts: {
      heading: 'Georgia',
      body: 'Georgia',
    },
  },
}

// 슬라이드 디자인 결과
interface DesignedSlide {
  index: number
  type: string
  layout: LayoutRule
  title: string
  subtitle?: string
  content: any
  images: SlideImage[]
  icons: SlideIcon[]
  design: {
    backgroundColor: string
    textColor: string
    accentColor: string
  }
}

interface SlideImage {
  url: string
  position: string
  width: number
  height: number
  alt: string
  source: string
}

interface SlideIcon {
  name: string
  svg: string
  base64: string
  color: string
  size: number
  position: { x: number; y: number }
}

export interface SlideDesignerRequest {
  content: string                    // 슬라이드 내용 또는 프롬프트
  slideCount?: number                // 슬라이드 수 (기본 10)
  theme?: keyof typeof THEMES        // 테마 선택
  generateImages?: boolean           // 이미지 생성 여부
  generateIcons?: boolean            // 아이콘 생성 여부
  language?: 'ko' | 'en'             // 언어
  purpose?: 'pitch' | 'report' | 'education' | 'marketing'  // 용도
}

export interface SlideDesignerResponse {
  success: boolean
  presentation: {
    title: string
    theme: typeof THEMES[keyof typeof THEMES]
    slides: DesignedSlide[]
    totalSlides: number
  }
  designPrinciples: string
  error?: string
}

// 아이콘 가져오기 (직접 함수 호출)
async function fetchIcon(keyword: string, color: string, size: number): Promise<SlideIcon | null> {
  try {
    const icons = await searchIcons(keyword, { size, color, limit: 1 })

    if (icons.length > 0) {
      const icon = icons[0]
      return {
        name: icon.name,
        svg: icon.svg,
        base64: icon.base64,
        color,
        size,
        position: { x: 0, y: 0 },
      }
    }
  } catch (error) {
    console.error(`[SlideDesigner] Icon fetch error:`, error)
  }
  return null
}

// 이미지 검색 (직접 함수 호출)
async function fetchImage(query: string, orientation: string = 'landscape'): Promise<SlideImage | null> {
  try {
    const image = await fetchSlideImage(query, orientation)
    return image
  } catch (error) {
    console.error(`[SlideDesigner] Image fetch error:`, error)
  }
  return null
}

// 슬라이드 콘텐츠 생성 함수는 content-service에서 import
// generateSlideContent from '@/lib/slide-engine/content-service'

// 슬라이드 디자인 적용
async function designSlides(
  rawSlides: any[],
  theme: typeof THEMES[keyof typeof THEMES],
  generateImages: boolean,
  generateIcons: boolean
): Promise<DesignedSlide[]> {
  const designedSlides: DesignedSlide[] = []

  for (let i = 0; i < rawSlides.length; i++) {
    const slide = rawSlides[i]

    // 슬라이드 타입 결정
    const slideType = determineSlideType(slide, i, rawSlides.length)
    const layout = LAYOUT_RULES[slideType] || LAYOUT_RULES.content

    // 아이콘 가져오기
    const icons: SlideIcon[] = []
    if (generateIcons && layout.iconCount > 0) {
      const keywords = extractKeywordsFromSlide(slide)
      for (let j = 0; j < Math.min(layout.iconCount, keywords.length); j++) {
        const icon = await fetchIcon(keywords[j], theme.colors.primary, 64)
        if (icon) {
          icon.position = calculateIconPosition(j, layout.iconCount, layout.layout)
          icons.push(icon)
        }
      }
    }

    // 이미지 가져오기
    const images: SlideImage[] = []
    if (generateImages && ['background', 'right', 'left', 'photos'].includes(layout.imagePosition)) {
      const imageQuery = slide.title || extractKeywordsFromSlide(slide).join(' ')
      const image = await fetchImage(imageQuery)
      if (image) {
        image.position = layout.imagePosition
        images.push(image)
      }
    }

    designedSlides.push({
      index: i,
      type: slideType,
      layout,
      title: slide.title,
      subtitle: slide.subtitle,
      content: slide.content || slide.points || [],
      images,
      icons,
      design: {
        backgroundColor: theme.colors.background,
        textColor: theme.colors.text,
        accentColor: theme.colors.primary,
      },
    })
  }

  return designedSlides
}

// 슬라이드 타입 결정
function determineSlideType(slide: any, index: number, totalSlides: number): string {
  const title = (slide.title || '').toLowerCase()

  if (index === 0) return 'cover'
  if (index === totalSlides - 1) return 'contact'

  if (title.includes('문제') || title.includes('problem')) return 'problem'
  if (title.includes('솔루션') || title.includes('해결') || title.includes('solution')) return 'solution'
  if (title.includes('시장') || title.includes('market')) return 'market'
  if (title.includes('비즈니스') || title.includes('수익') || title.includes('business')) return 'business-model'
  if (title.includes('팀') || title.includes('team')) return 'team'
  if (title.includes('로드맵') || title.includes('roadmap') || title.includes('계획')) return 'roadmap'
  if (title.includes('투자') || title.includes('investment')) return 'investment'

  return 'content'
}

// 슬라이드에서 키워드 추출
function extractKeywordsFromSlide(slide: any): string[] {
  const text = [
    slide.title || '',
    slide.subtitle || '',
    ...(Array.isArray(slide.content) ? slide.content : []),
    ...(Array.isArray(slide.points) ? slide.points : []),
  ].join(' ')

  // 한글 명사 추출
  const koreanNouns = text.match(/[가-힣]{2,}/g) || []
  // 영어 단어 추출
  const englishWords = text.match(/[a-zA-Z]{4,}/g) || []

  return [...new Set([...koreanNouns, ...englishWords])].slice(0, 5)
}

// 아이콘 위치 계산
function calculateIconPosition(index: number, total: number, layout: string): { x: number; y: number } {
  if (layout === 'icon-grid-3col') {
    const col = index % 3
    const row = Math.floor(index / 3)
    return {
      x: 100 + col * 300,
      y: 200 + row * 200,
    }
  }
  return { x: 50 + index * 100, y: 200 }
}

export async function POST(request: NextRequest) {
  try {
    const body: SlideDesignerRequest = await request.json()
    const {
      content,
      slideCount = 10,
      theme: themeName = 'modern',
      generateImages = true,
      generateIcons = true,
      language = 'ko',
      purpose = 'pitch',
    } = body

    if (!content) {
      return NextResponse.json(
        { success: false, error: '콘텐츠가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`[SlideDesigner] 🎨 Designing presentation: "${content.slice(0, 50)}..."`)
    console.log(`[SlideDesigner] Theme: ${themeName}, Slides: ${slideCount}, Images: ${generateImages}, Icons: ${generateIcons}`)

    const theme = THEMES[themeName] || THEMES.modern

    // 1. 슬라이드 콘텐츠 생성 (직접 함수 호출)
    console.log('[SlideDesigner] Step 1: Generating slide content...')
    let rawSlides
    try {
      rawSlides = await generateSlideContent(content, slideCount, theme.name.toLowerCase(), language)
    } catch (genError: any) {
      console.error('[SlideDesigner] Content generation failed:', genError)
      return NextResponse.json(
        { success: false, error: genError.message || '슬라이드 콘텐츠 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!rawSlides || rawSlides.length === 0) {
      return NextResponse.json(
        { success: false, error: '슬라이드 콘텐츠가 생성되지 않았습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    // 2. 디자인 적용 (아이콘, 이미지)
    console.log('[SlideDesigner] Step 2: Applying design...')
    const designedSlides = await designSlides(rawSlides, theme, generateImages, generateIcons)

    console.log(`[SlideDesigner] ✅ Designed ${designedSlides.length} slides`)

    return NextResponse.json({
      success: true,
      presentation: {
        title: rawSlides[0]?.title || '프레젠테이션',
        theme,
        slides: designedSlides,
        totalSlides: designedSlides.length,
      },
      designPrinciples: DESIGN_PRINCIPLES,
    })

  } catch (error: any) {
    console.error('[SlideDesigner] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '슬라이드 디자인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET - API 정보
export async function GET() {
  return NextResponse.json({
    service: 'Slide Designer',
    version: '1.0.0',
    description: '전문가 수준 슬라이드 생성 통합 스킬',
    capabilities: [
      '디자인 원칙 20가지 기반 슬라이드 구조화',
      '아이콘 자동 매칭 (react-icons 40+ 라이브러리)',
      '스톡 이미지 검색 (Unsplash/Pexels)',
      'AI 이미지 생성 (Nano Banana/Z-Image)',
      '5가지 프로페셔널 테마',
      '10가지 레이아웃 템플릿',
    ],
    themes: Object.keys(THEMES),
    layouts: Object.entries(LAYOUT_RULES).map(([key, rule]) => ({
      type: key,
      name: rule.name,
      design: rule.design,
    })),
    parameters: {
      content: { type: 'string', required: true, description: '슬라이드 내용 또는 프롬프트' },
      slideCount: { type: 'number', default: 10, description: '슬라이드 수' },
      theme: { type: 'string', default: 'modern', options: Object.keys(THEMES) },
      generateImages: { type: 'boolean', default: true, description: '이미지 생성 여부' },
      generateIcons: { type: 'boolean', default: true, description: '아이콘 생성 여부' },
      language: { type: 'string', default: 'ko', options: ['ko', 'en'] },
      purpose: { type: 'string', default: 'pitch', options: ['pitch', 'report', 'education', 'marketing'] },
    },
    designPrinciples: DESIGN_PRINCIPLES,
  })
}
