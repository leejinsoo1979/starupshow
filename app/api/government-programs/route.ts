import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { fetchBizinfoPrograms, transformBizinfoProgram } from '@/lib/government/bizinfo'
import { fetchKStartupPrograms, transformKStartupProgram } from '@/lib/government/kstartup'

/**
 * 정부지원사업 목록 조회 API
 * GET /api/government-programs
 */
export async function GET(request: NextRequest) {
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

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const status = searchParams.get('status') // 'active' | 'ended' | 'upcoming' | 'all'
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // DB 테이블 존재 확인
    const { error: tableError } = await supabase
      .from('government_programs')
      .select('id')
      .limit(1)

    // 테이블이 없으면 API에서 직접 데이터 가져오기
    if (tableError?.message?.includes('Could not find')) {
      console.log('[GovernmentPrograms] 테이블 없음 - API에서 직접 조회')

      // 기업마당 데이터
      const bizinfoRaw = await fetchBizinfoPrograms({ searchCount: 50 })
      const bizinfoPrograms = bizinfoRaw.map(p => {
        const transformed = transformBizinfoProgram(p)
        return {
          id: transformed.program_id,
          ...transformed
        }
      })

      // K-Startup 데이터
      const kstartupRaw = await fetchKStartupPrograms({ perPage: 50 })
      const kstartupPrograms = kstartupRaw.map(p => {
        const transformed = transformKStartupProgram(p)
        return {
          id: transformed.program_id,
          ...transformed
        }
      })

      // 합치기
      let programs = [...bizinfoPrograms, ...kstartupPrograms]

      // 필터 적용
      if (source && source !== 'all') {
        programs = programs.filter(p => p.source === source)
      }
      if (category) {
        programs = programs.filter(p => p.category === category)
      }
      if (search) {
        const q = search.toLowerCase()
        programs = programs.filter(p =>
          p.title.toLowerCase().includes(q) ||
          p.organization?.toLowerCase().includes(q)
        )
      }

      // 카테고리 통계
      const allPrograms = [...bizinfoPrograms, ...kstartupPrograms]
      const categoryStats: Record<string, number> = {}
      allPrograms.forEach(p => {
        const cat = p.category || '기타'
        categoryStats[cat] = (categoryStats[cat] || 0) + 1
      })

      return NextResponse.json({
        success: true,
        programs: programs.slice(offset, offset + limit),
        total: programs.length,
        categoryStats,
        sources: {
          bizinfo: bizinfoPrograms.length,
          kstartup: kstartupPrograms.length
        },
        isDemo: true,
        message: 'DB 마이그레이션 필요 - API 직접 조회 중',
        pagination: {
          limit,
          offset,
          hasMore: programs.length > offset + limit
        }
      })
    }

    // DB에서 조회
    let query = supabase
      .from('government_programs')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (category) {
      query = query.eq('category', category)
    }

    if (source) {
      query = query.eq('source', source)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,organization.ilike.%${search}%`)
    }

    // 상태별 필터
    const today = new Date().toISOString().split('T')[0]
    if (status === 'active') {
      query = query.gte('apply_end_date', today).lte('apply_start_date', today)
    } else if (status === 'upcoming') {
      query = query.gt('apply_start_date', today)
    } else if (status === 'ended') {
      query = query.lt('apply_end_date', today)
    }

    // 정렬 및 페이지네이션
    query = query
      .order('apply_end_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: programs, error, count } = await query

    if (error) {
      console.error('[GovernmentPrograms] DB 조회 오류:', error)
      throw error
    }

    // 카테고리별 통계
    const { data: stats } = await (supabase as any)
      .from('government_programs')
      .select('category') as { data: { category: string }[] | null }

    const categoryStats: Record<string, number> = {}
    stats?.forEach(item => {
      const cat = item.category || '기타'
      categoryStats[cat] = (categoryStats[cat] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      programs: programs || [],
      total: count || 0,
      categoryStats,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error: any) {
    console.error('[GovernmentPrograms] Error:', error)
    return NextResponse.json(
      { error: error.message || '데이터 조회 실패' },
      { status: 500 }
    )
  }
}
