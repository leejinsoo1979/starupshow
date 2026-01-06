// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 회사 지원사업 프로필 타입 정의
 */
interface CompanySupportProfile {
  id?: string
  company_id?: string
  user_id: string

  // 회사 기본 정보
  company_name?: string

  // 대표자 정보
  ceo_name?: string
  ceo_birth_date?: string  // DATE type, stored as ISO string

  // 사업 분류
  industry_code?: string
  industry_category?: string
  industry_subcategory?: string

  // 사업 내용 (상세)
  business_description?: string
  main_products?: string
  core_technologies?: string

  // 사업 규모
  annual_revenue?: number
  employee_count?: number
  business_years?: number

  // 사업자 유형
  entity_type?: string       // 법인/개인/예비창업자
  startup_stage?: string     // 예비/초기/도약/성장

  // 지역
  region?: string
  city?: string

  // 특수 조건
  is_youth_startup?: boolean
  is_female_owned?: boolean
  is_social_enterprise?: boolean
  is_export_business?: boolean
  tech_certifications?: string[]

  // 관심 분야
  interested_categories?: string[]
  interested_keywords?: string[]

  // 메타데이터
  profile_completeness?: number
}

/**
 * 프로필 내용에서 매칭 키워드 자동 추출
 * business_description, main_products, core_technologies에서 의미있는 키워드 추출
 */
function extractMatchingKeywords(profile: Partial<CompanySupportProfile>): string[] {
  const keywords = new Set<string>()

  // 수집할 텍스트들
  const texts = [
    profile.business_description || '',
    profile.main_products || '',
    profile.core_technologies || '',
  ].join(' ')

  // 1. 영문 기술 키워드 추출 (대소문자 보존)
  const techTerms = [
    // AI/ML
    'AI', 'ML', 'LLM', 'GPT', 'NLP', 'NLU', 'RAG', 'VectorDB', 'Embedding',
    'Machine Learning', 'Deep Learning', 'Neural Network', 'Transformer',
    'ChatGPT', 'Claude', 'OpenAI', 'Anthropic', 'Gemini',
    'Agent', 'Multi-Agent', 'AutoML', 'MLOps', 'AIOps',
    // 소프트웨어/플랫폼
    'SaaS', 'PaaS', 'IaaS', 'BaaS', 'API', 'SDK', 'Cloud', 'AWS', 'GCP', 'Azure',
    'B2B', 'B2C', 'ERP', 'CRM', 'HRM', 'SCM', 'MES', 'WMS', 'RPA', 'BPM',
    'IoT', 'Edge', 'Embedded', 'Firmware', 'RTOS',
    // 데이터/분석
    'BigData', 'Data Analytics', 'Data Science', 'ETL', 'Data Lake', 'Data Warehouse',
    'BI', 'Business Intelligence', 'Dashboard', 'Visualization',
    // 보안
    'Cybersecurity', 'Security', 'Firewall', 'WAF', 'IDS', 'IPS', 'SIEM', 'SOC',
    'Blockchain', 'Crypto', 'NFT', 'DeFi', 'Web3',
    // 모바일/웹
    'Mobile', 'iOS', 'Android', 'Flutter', 'React Native', 'Hybrid',
    'Web', 'Frontend', 'Backend', 'Fullstack', 'DevOps', 'CI/CD',
    'React', 'Vue', 'Angular', 'Node', 'Python', 'Java', 'Go', 'Rust',
    // 기타 기술
    '3D', 'AR', 'VR', 'XR', 'Metaverse', 'Digital Twin',
    'Robotics', 'Automation', 'Smart Factory',
  ]

  for (const term of techTerms) {
    if (texts.toLowerCase().includes(term.toLowerCase())) {
      keywords.add(term)
    }
  }

  // 2. 한글 비즈니스 키워드 추출
  const koreanTerms = [
    // 기술 분야
    '인공지능', '머신러닝', '딥러닝', '자연어처리', '영상처리', '음성인식', '챗봇',
    '빅데이터', '데이터분석', '데이터플랫폼',
    '클라우드', '서버', '인프라', '네트워크', '보안',
    '블록체인', '암호화폐', '핀테크', '가상자산',
    // 산업 분야
    '헬스케어', '의료', '바이오', '제약', '진단',
    '이커머스', '쇼핑몰', '커머스', '유통', '물류',
    '핀테크', '금융', '결제', '대출', '보험', '투자',
    '에듀테크', '교육', '이러닝', 'LMS',
    '프롭테크', '부동산', '건설',
    '모빌리티', '자동차', '운송', '배송', '라스트마일',
    '스마트팜', '농업', '농기계',
    '환경', '에너지', '신재생', '태양광', 'ESG', '탄소중립',
    '콘텐츠', '미디어', '영상', '스트리밍', '게임', '메타버스',
    // 비즈니스 유형
    '플랫폼', '솔루션', '서비스', '시스템', '소프트웨어', '앱', '애플리케이션',
    '자동화', '효율화', '최적화', '혁신', '디지털전환', 'DX',
    '스타트업', '벤처', '창업', 'MVP', 'PMF',
    '구독', '멤버십', '마켓플레이스', '매칭',
    // 제품 유형
    '웹서비스', '모바일앱', 'API서비스', 'SaaS', '클라우드서비스',
    '하드웨어', '디바이스', '센서', '로봇', '드론',
  ]

  for (const term of koreanTerms) {
    if (texts.includes(term)) {
      keywords.add(term)
    }
  }

  // 3. 업종 기반 추가 키워드 (정보통신업 등)
  if (profile.industry_category) {
    const industryKeywords: Record<string, string[]> = {
      '정보통신업': ['IT', 'ICT', '소프트웨어', '정보기술', 'SW'],
      '제조업': ['제조', '생산', '공장', '설비'],
      '전문서비스업': ['컨설팅', '전문서비스', 'B2B서비스'],
      '도소매업': ['유통', '커머스', '판매'],
      '금융보험업': ['금융', '핀테크', '보험'],
    }

    const industryTerms = industryKeywords[profile.industry_category] || []
    for (const term of industryTerms) {
      keywords.add(term)
    }
  }

  // 4. 기술 인증 기반 키워드
  if (profile.tech_certifications && Array.isArray(profile.tech_certifications)) {
    for (const cert of profile.tech_certifications) {
      if (cert.includes('벤처')) keywords.add('벤처기업')
      if (cert.includes('이노비즈')) keywords.add('이노비즈')
      if (cert.includes('특허')) keywords.add('특허보유')
      if (cert.includes('기술혁신')) keywords.add('기술혁신형')
      if (cert.includes('연구소')) keywords.add('기업부설연구소')
    }
  }

  // 최대 20개 키워드로 제한
  return Array.from(keywords).slice(0, 20)
}

/**
 * 프로필 완성도 계산
 */
function calculateProfileCompleteness(profile: Partial<CompanySupportProfile>): number {
  const fields = [
    { key: 'company_name', weight: 5 },
    { key: 'ceo_name', weight: 5 },
    { key: 'ceo_birth_date', weight: 5 },
    { key: 'industry_category', weight: 8 },
    { key: 'business_description', weight: 12 },
    { key: 'main_products', weight: 8 },
    { key: 'core_technologies', weight: 8 },
    { key: 'annual_revenue', weight: 7 },
    { key: 'employee_count', weight: 5 },
    { key: 'business_years', weight: 5 },
    { key: 'entity_type', weight: 10 },
    { key: 'startup_stage', weight: 5 },
    { key: 'region', weight: 8 },
    { key: 'interested_categories', weight: 5, isArray: true },
    { key: 'tech_certifications', weight: 2, isArray: true },
  ]

  let completeness = 0

  for (const field of fields) {
    const value = (profile as any)[field.key]
    if (field.isArray) {
      if (Array.isArray(value) && value.length > 0) {
        completeness += field.weight
      }
    } else if (field.isBoolean) {
      // boolean 필드는 true일 때만 가산
      if (value === true) {
        completeness += field.weight
      }
    } else if (value !== null && value !== undefined && value !== '') {
      completeness += field.weight
    }
  }

  return Math.min(100, completeness)
}

/**
 * GET: 현재 사용자의 회사 프로필 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 프로필 조회
    const { data: profile, error } = await adminSupabase
      .from('company_support_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error
    }

    // 프로필이 없으면 빈 프로필 반환
    if (!profile) {
      // 프로필은 없지만 회사는 있을 수 있으므로 회사 정보 조회 시도
      const { data: company } = await adminSupabase
        .from('companies')
        .select('name, logo_url')
        .eq('user_id', user.id)
        .single()

      return NextResponse.json({
        success: true,
        profile: company ? {
          company_name: company.name,
          logo: company.logo_url
        } : null,
        message: '프로필이 아직 생성되지 않았습니다.'
      })
    }

    // 회사 정보 조회 (profile.company_id가 있으면 그것을 사용, 없으면 user_id로 조회)
    let companyName = null
    let companyLogo = null

    if (profile.company_id) {
      const { data: company } = await adminSupabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', profile.company_id)
        .single()

      if (company) {
        companyName = company.name
        companyLogo = company.logo_url
      }
    } else {
      // company_id가 없는 경우 user_id로 연결된 회사 찾기
      const { data: company } = await adminSupabase
        .from('companies')
        .select('name, logo_url')
        .eq('user_id', user.id)
        .single()

      if (company) {
        companyName = company.name
        companyLogo = company.logo_url
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        company_name: profile.company_name || companyName, // profile 우선, 없으면 companies 테이블
        logo: companyLogo
      }
    })

  } catch (error: any) {
    console.error('[CompanyProfile] GET Error:', error)
    return NextResponse.json(
      { error: error.message || '프로필 조회 실패' },
      { status: 500 }
    )
  }
}

/**
 * POST: 새 프로필 생성
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 기존 프로필 확인
    const { data: existing } = await adminSupabase
      .from('company_support_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '프로필이 이미 존재합니다. PUT 메서드를 사용하세요.' },
        { status: 409 }
      )
    }

    // 프로필 완성도 계산
    const profileCompleteness = calculateProfileCompleteness(body)

    // 새 프로필 생성
    const profileData: CompanySupportProfile = {
      user_id: user.id,
      company_id: body.company_id || undefined,
      company_name: body.company_name,
      ceo_name: body.ceo_name,
      ceo_birth_date: body.ceo_birth_date || undefined,
      industry_code: body.industry_code,
      industry_category: body.industry_category,
      industry_subcategory: body.industry_subcategory,
      business_description: body.business_description,
      main_products: body.main_products,
      core_technologies: body.core_technologies,
      annual_revenue: body.annual_revenue ? parseFloat(body.annual_revenue) : undefined,
      employee_count: body.employee_count ? parseInt(body.employee_count) : undefined,
      business_years: body.business_years ? parseInt(body.business_years) : undefined,
      entity_type: body.entity_type,
      startup_stage: body.startup_stage,
      region: body.region,
      city: body.city,
      is_youth_startup: body.is_youth_startup || false,
      is_female_owned: body.is_female_owned || false,
      is_social_enterprise: body.is_social_enterprise || false,
      is_export_business: body.is_export_business || false,
      tech_certifications: body.tech_certifications || [],
      interested_categories: body.interested_categories || [],
      interested_keywords: body.interested_keywords || [],
      profile_completeness: profileCompleteness
    }

    const { data: profile, error } = await adminSupabase
      .from('company_support_profiles')
      .insert(profileData as any)
      .select()
      .single()

    if (error) {
      throw error
    }

    // 회사명 업데이트 및 연결 처리 (POST)
    if (body.company_name) {
      // 1. user_id로 기존 회사 찾기
      const { data: existingCompany } = await adminSupabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existingCompany) {
        // 회사가 존재하면 이름 업데이트
        await adminSupabase
          .from('companies')
          .update({ name: body.company_name })
          .eq('id', existingCompany.id)

        // 프로필에 회사 연결 (이미 연결되어 있을 수도 있지만 확실히 하기 위해)
        await adminSupabase
          .from('company_support_profiles')
          .update({ company_id: existingCompany.id })
          .eq('id', profile.id)
      } else {
        // 회사가 없으면 새 회사 생성
        const { data: newCompany } = await adminSupabase
          .from('companies')
          .insert({
            name: body.company_name,
            user_id: user.id
          })
          .select()
          .single()

        if (newCompany) {
          // 프로필에 새 회사 연결
          await adminSupabase
            .from('company_support_profiles')
            .update({ company_id: newCompany.id })
            .eq('id', profile.id)
        }
      }
    }

    // 최신 회사 정보 조회 (반환용)
    // 위에서 생성/업데이트 했으므로 다시 조회하여 확실한 데이터 반환
    const { data: company } = await adminSupabase
      .from('companies')
      .select('name, logo_url')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        company_name: company?.name,
        logo: company?.logo_url
      },
      message: '프로필이 생성되었습니다.'
    })


  } catch (error: any) {
    console.error('[CompanyProfile] POST Error:', error)
    return NextResponse.json(
      { error: error.message || '프로필 생성 실패' },
      { status: 500 }
    )
  }
}

/**
 * PUT: 프로필 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 기존 프로필 확인
    const { data: existing } = await adminSupabase
      .from('company_support_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: '프로필이 존재하지 않습니다. POST 메서드를 사용하세요.' },
        { status: 404 }
      )
    }

    // 업데이트할 데이터 준비
    const updateData: Partial<CompanySupportProfile> = {}

    const allowedFields = [
      'company_id', 'company_name', 'ceo_name', 'ceo_birth_date',
      'industry_code', 'industry_category', 'industry_subcategory',
      'business_description', 'main_products', 'core_technologies',
      'annual_revenue', 'employee_count', 'business_years',
      'entity_type', 'startup_stage', 'region', 'city',
      'is_youth_startup', 'is_female_owned', 'is_social_enterprise', 'is_export_business',
      'tech_certifications', 'interested_categories', 'interested_keywords'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as any)[field] = body[field]
      }
    }

    // 숫자 필드 변환
    if (updateData.annual_revenue) {
      updateData.annual_revenue = parseFloat(updateData.annual_revenue as any)
    }
    if (updateData.employee_count) {
      updateData.employee_count = parseInt(updateData.employee_count as any)
    }
    if (updateData.business_years) {
      updateData.business_years = parseInt(updateData.business_years as any)
    }

    // 프로필 완성도 재계산
    const mergedProfile = { ...(existing as object || {}), ...updateData }
    updateData.profile_completeness = calculateProfileCompleteness(mergedProfile as any)

    // 🔄 프로필 내용 변경 시 매칭 키워드 자동 재생성
    // (사용자가 직접 키워드를 지정하지 않은 경우에만 자동 생성)
    const contentChanged =
      body.business_description !== undefined ||
      body.main_products !== undefined ||
      body.core_technologies !== undefined ||
      body.industry_category !== undefined ||
      body.tech_certifications !== undefined

    if (contentChanged && !body.interested_keywords) {
      // 프로필 내용이 변경되었고, 사용자가 키워드를 직접 지정하지 않은 경우
      const autoKeywords = extractMatchingKeywords(mergedProfile as any)

      // 기존 사용자 지정 키워드와 병합 (중복 제거)
      const existingKeywords = existing.interested_keywords || []
      const mergedKeywords = [...new Set([...autoKeywords, ...existingKeywords])]

      updateData.interested_keywords = mergedKeywords.slice(0, 20) // 최대 20개
    }

    // body.regenerate_keywords = true 인 경우 강제 재생성
    if (body.regenerate_keywords === true) {
      const autoKeywords = extractMatchingKeywords(mergedProfile as any)
      updateData.interested_keywords = autoKeywords
    }

    const { data: profile, error } = await adminSupabase
      .from('company_support_profiles')
      .update(updateData as any)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // 회사명 업데이트 및 연결 처리
    if (body.company_name) {
      let targetCompanyId = existing.company_id

      if (!targetCompanyId) {
        // 연결된 회사가 없으면 user_id로 찾기
        const { data: foundCompany } = await adminSupabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (foundCompany) {
          targetCompanyId = foundCompany.id
          // 프로필에 company_id 업데이트 (연결)
          await adminSupabase
            .from('company_support_profiles')
            .update({ company_id: targetCompanyId })
            .eq('id', existing.id)
        }
      }

      if (targetCompanyId) {
        // 기존 회사 업데이트
        await adminSupabase
          .from('companies')
          .update({ name: body.company_name })
          .eq('id', targetCompanyId)
      } else {
        // 회사도 없고 연결도 안되어 있으면 -> 새 회사 생성
        const { data: newCompany } = await adminSupabase
          .from('companies')
          .insert({
            name: body.company_name,
            user_id: user.id
          })
          .select()
          .single()

        if (newCompany) {
          // 프로필에 새 회사 연결
          await adminSupabase
            .from('company_support_profiles')
            .update({ company_id: newCompany.id })
            .eq('id', existing.id)

          // existing 객체 업데이트 (아래 조회 로직을 위해)
          existing.company_id = newCompany.id
        }
      }
    }

    // 최신 회사 정보 조회
    let companyName = null
    let companyLogo = null
    const lookupId = existing.company_id // 위 로직에서 업데이트되었을 수 있음

    if (lookupId) {
      const { data: company } = await adminSupabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', lookupId)
        .single()

      if (company) {
        companyName = company.name
        companyLogo = company.logo_url
      }
    } else {
      // 혹시라도 위 과정 실패시 user_id로 재조회
      const { data: company } = await adminSupabase
        .from('companies')
        .select('name, logo_url')
        .eq('user_id', user.id)
        .single()

      if (company) {
        companyName = company.name
        companyLogo = company.logo_url
      }
    }

    // profile 변수는 이미 위에서 update 응답으로 받음. company info만 병합
    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        company_name: profile.company_name || companyName, // profile 우선
        logo: companyLogo
      },
      message: '프로필이 업데이트되었습니다.'
    })

  } catch (error: any) {
    console.error('[CompanyProfile] PUT Error:', error)
    return NextResponse.json(
      { error: error.message || '프로필 업데이트 실패' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: 프로필 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await adminSupabase
      .from('company_support_profiles')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: '프로필이 삭제되었습니다.'
    })

  } catch (error: any) {
    console.error('[CompanyProfile] DELETE Error:', error)
    return NextResponse.json(
      { error: error.message || '프로필 삭제 실패' },
      { status: 500 }
    )
  }
}
