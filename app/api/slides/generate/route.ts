import { NextRequest, NextResponse } from 'next/server'

// Slide structure types
interface SlideContent {
    id: string
    type: string
    title: string
    subtitle?: string
    content: any
}

interface GenerateRequest {
    prompt: string
    slideCount?: number
    businessType?: string
    purpose?: string
}

const SLIDE_TEMPLATES = {
    cover: {
        type: 'cover',
        promptKey: '표지',
        fields: ['title', 'subtitle', 'tagline', 'presenter', 'date']
    },
    problem: {
        type: 'problem',
        promptKey: '문제 정의',
        fields: ['issues', 'targetCustomer', 'opportunity']
    },
    solution: {
        type: 'solution',
        promptKey: '솔루션',
        fields: ['mainDesc', 'features']
    },
    market: {
        type: 'market',
        promptKey: '시장 기회',
        fields: ['tam', 'sam', 'som', 'cagr']
    },
    'business-model': {
        type: 'business-model',
        promptKey: '비즈니스 모델',
        fields: ['model', 'pricing', 'metrics']
    },
    product: {
        type: 'product',
        promptKey: '제품/서비스',
        fields: ['architecture', 'screenshots', 'performance', 'status']
    },
    competition: {
        type: 'competition',
        promptKey: '경쟁 분석',
        fields: ['competitors', 'comparison', 'positioning', 'moat']
    },
    gtm: {
        type: 'gtm',
        promptKey: '시장 진입 전략',
        fields: ['icp', 'salesMotion', 'channels', 'pipeline']
    },
    marketing: {
        type: 'marketing',
        promptKey: '마케팅 전략',
        fields: ['channels', 'message', 'budget', 'kpi']
    },
    team: {
        type: 'team',
        promptKey: '팀 소개',
        fields: ['founders', 'keyMembers', 'advisors', 'hiringPlan']
    },
    roadmap: {
        type: 'roadmap',
        promptKey: '로드맵',
        fields: ['milestones', 'risks']
    },
    revenue: {
        type: 'revenue',
        promptKey: '매출 전망',
        fields: ['projections', 'assumptions']
    },
    financials: {
        type: 'financials',
        promptKey: '재무 계획',
        fields: ['summary', 'costs', 'runway', 'useOfFunds']
    },
    investment: {
        type: 'investment',
        promptKey: '투자 제안',
        fields: ['round', 'valuation', 'terms', 'progress']
    },
    contact: {
        type: 'contact',
        promptKey: '연락처',
        fields: ['name', 'email', 'phone', 'website', 'dataroom']
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateRequest = await request.json()
        const { prompt, slideCount = 15, businessType = 'IT 스타트업', purpose = '투자 유치' } = body

        const apiKey = process.env.XAI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
        }

        // Generate slide outline first
        const outlinePrompt = `당신은 전문 사업계획서 작성 전문가입니다.
다음 요청에 맞는 ${slideCount}장의 사업계획서 슬라이드를 JSON 형식으로 생성해주세요.

요청: ${prompt}
사업 분야: ${businessType}
목적: ${purpose}

각 슬라이드는 다음 형식을 따라야 합니다:
{
    "slides": [
        {
            "id": "1",
            "type": "cover|problem|solution|market|business-model|product|competition|gtm|marketing|team|roadmap|revenue|financials|investment|contact",
            "title": "슬라이드 제목",
            "subtitle": "부제목 (선택)",
            "content": {
                // type에 따른 구체적인 콘텐츠
            }
        }
    ]
}

type별 content 구조:
- cover: { tagline: string, presenter: string, date: string }
- problem: { issues: [{icon: string, title: string, desc: string}], targetCustomer: string, opportunity: string }
- solution: { mainDesc: string, features: [{icon: string, title: string, desc: string}] }
- market: { tam: {value: string, label: string, desc: string}, sam: {...}, som: {...}, cagr: string }
- business-model: { model: string, pricing: [{tier: string, price: string, features: string[]}], metrics: {arpu: string, ltv: string, cac: string} }
- product: { architecture: string, screenshots: string[], performance: string, status: string }
- competition: { competitors: string[], comparison: [{criteria: string, us: string, them: string}], positioning: string, moat: string }
- gtm: { icp: string, salesMotion: string, channels: string[], pipeline: string }
- marketing: { channels: string[], message: string, budget: string, kpi: string }
- team: { founders: [{name: string, role: string, background: string}], advisors: string[], hiringPlan: string }
- roadmap: { milestones: [{period: string, items: string[]}], risks: string }
- revenue: { projections: [{year: string, revenue: string}], assumptions: string[] }
- financials: { summary: string, costs: {category: string, percentage: string}[], runway: string, useOfFunds: string }
- investment: { round: string, amount: string, valuation: string, terms: string, progress: string }
- contact: { name: string, title: string, email: string, phone: string, website: string }

실제 사업계획서에 사용할 수 있는 구체적이고 현실적인 내용을 작성해주세요.
아이콘은 이모지를 사용하세요.
JSON만 출력하세요.`

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'grok-3-mini',
                messages: [
                    { role: 'system', content: '당신은 전문 사업계획서 작성 전문가입니다. 요청에 맞는 고품질 슬라이드 콘텐츠를 JSON 형식으로 생성합니다.' },
                    { role: 'user', content: outlinePrompt }
                ],
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('[Slides API] Grok error:', error)
            return NextResponse.json({ error: 'Failed to generate slides' }, { status: 500 })
        }

        const data = await response.json()
        let content = data.choices?.[0]?.message?.content || ''

        // Parse JSON from response
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (jsonMatch) {
                content = jsonMatch[1].trim()
            }

            const slidesData = JSON.parse(content)
            return NextResponse.json({
                success: true,
                slides: slidesData.slides,
                totalSlides: slidesData.slides?.length || 0
            })
        } catch (parseError) {
            console.error('[Slides API] JSON parse error:', parseError)
            // Return sample slides as fallback
            return NextResponse.json({
                success: true,
                slides: generateFallbackSlides(businessType, purpose, slideCount),
                totalSlides: slideCount,
                fallback: true
            })
        }
    } catch (error) {
        console.error('[Slides API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Fallback slide generator
function generateFallbackSlides(businessType: string, purpose: string, count: number): SlideContent[] {
    const slides: SlideContent[] = [
        {
            id: '1',
            type: 'cover',
            title: '[회사명]',
            subtitle: `${businessType} - ${purpose}용 사업계획서`,
            content: {
                tagline: '혁신적인 솔루션으로 시장을 선도합니다',
                presenter: '대표이사 | CEO',
                date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
            }
        },
        {
            id: '2',
            type: 'problem',
            title: '문제 정의',
            subtitle: '시장이 직면한 핵심 과제',
            content: {
                issues: [
                    { icon: '📊', title: '비효율적인 프로세스', desc: '기존 방식의 한계로 인한 시간과 비용 낭비' },
                    { icon: '💰', title: '높은 운영 비용', desc: '레거시 시스템 유지보수에 따른 과도한 지출' },
                    { icon: '🔗', title: '데이터 단절', desc: '부서 간 정보 공유의 어려움' }
                ],
                targetCustomer: '중견기업 및 스타트업',
                opportunity: '문제 해결 시 30% 이상 효율성 향상 기대'
            }
        },
        {
            id: '3',
            type: 'solution',
            title: '솔루션 개요',
            subtitle: '혁신적인 접근 방식',
            content: {
                mainDesc: '최신 기술을 활용한 통합 솔루션으로 고객의 핵심 문제를 해결합니다.',
                features: [
                    { icon: '⚡', title: '자동화', desc: '반복 업무의 90% 자동화' },
                    { icon: '🔄', title: '실시간 연동', desc: '모든 시스템 통합' },
                    { icon: '📈', title: '분석 인사이트', desc: 'AI 기반 예측 분석' }
                ]
            }
        },
        {
            id: '4',
            type: 'market',
            title: '시장 기회',
            subtitle: 'TAM · SAM · SOM',
            content: {
                tam: { value: '100조원', label: 'Total Addressable Market', desc: '글로벌 시장 규모' },
                sam: { value: '10조원', label: 'Serviceable Addressable Market', desc: '국내 목표 시장' },
                som: { value: '1,000억원', label: 'Serviceable Obtainable Market', desc: '3년 내 목표' },
                cagr: '연평균 성장률 20%'
            }
        },
        {
            id: '5',
            type: 'business-model',
            title: '비즈니스 모델',
            subtitle: '수익 창출 구조',
            content: {
                model: 'SaaS 구독 모델',
                pricing: [
                    { tier: 'Basic', price: '월 50만원', features: ['기본 기능', '5명 사용자'] },
                    { tier: 'Pro', price: '월 150만원', features: ['고급 기능', '무제한 사용자'] },
                    { tier: 'Enterprise', price: '맞춤 견적', features: ['전용 지원', '커스터마이징'] }
                ],
                metrics: { arpu: '월 100만원', ltv: '1,200만원', cac: '200만원' }
            }
        }
    ]

    // Add more slides based on count
    const additionalTypes = ['product', 'competition', 'gtm', 'marketing', 'team', 'roadmap', 'revenue', 'financials', 'investment', 'contact']

    for (let i = slides.length; i < Math.min(count, slides.length + additionalTypes.length); i++) {
        const type = additionalTypes[i - slides.length]
        slides.push({
            id: String(i + 1),
            type,
            title: SLIDE_TEMPLATES[type as keyof typeof SLIDE_TEMPLATES]?.promptKey || type,
            subtitle: '',
            content: {}
        })
    }

    return slides
}
