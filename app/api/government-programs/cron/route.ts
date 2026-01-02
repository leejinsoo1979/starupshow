import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchBizinfoPrograms,
  transformBizinfoProgram,
  BIZINFO_CATEGORIES,
  type BizinfoCategory
} from '@/lib/government/bizinfo'
import {
  fetchKStartupPrograms,
  transformKStartupProgram
} from '@/lib/government/kstartup'

/**
 * 정부지원사업 데이터 자동 수집 스케줄러
 * GET /api/government-programs/cron
 *
 * Vercel Cron 또는 외부 스케줄러에서 호출
 *
 * vercel.json 설정 예시:
 * {
 *   "crons": [{
 *     "path": "/api/government-programs/cron",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Cron 인증 확인 (Vercel Cron 또는 Authorization 헤더)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Vercel Cron은 자동으로 인증됨, 그 외에는 CRON_SECRET 확인
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isAuthorized = isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`)

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    console.log('[GovernmentPrograms Cron] 자동 수집 시작:', new Date().toISOString())

    // 테이블 존재 확인
    const { error: tableError } = await supabase
      .from('government_programs')
      .select('id')
      .limit(1)

    if (tableError?.message?.includes('Could not find')) {
      console.log('[GovernmentPrograms Cron] 테이블 없음 - 스킵')
      return NextResponse.json({
        success: false,
        message: 'DB 테이블이 없습니다. 마이그레이션을 실행하세요.',
        skipped: true
      })
    }

    // ========== 1. 기업마당 데이터 수집 ==========
    let bizinfoPrograms: any[] = []
    const errors: string[] = []

    console.log('[GovernmentPrograms Cron] 기업마당 수집 시작...')
    for (const catId of Object.keys(BIZINFO_CATEGORIES) as BizinfoCategory[]) {
      try {
        const programs = await fetchBizinfoPrograms({
          category: catId,
          searchCount: 50
        })
        bizinfoPrograms.push(...programs)

        // Rate limiting 방지
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error: any) {
        console.error(`[GovernmentPrograms Cron] 기업마당 ${catId} 수집 실패:`, error.message)
        errors.push(`bizinfo-${catId}: ${error.message}`)
      }
    }
    console.log(`[GovernmentPrograms Cron] 기업마당 ${bizinfoPrograms.length}개 수집`)

    // ========== 2. K-Startup 데이터 수집 ==========
    let kstartupPrograms: any[] = []

    console.log('[GovernmentPrograms Cron] K-Startup 수집 시작...')
    try {
      const programs = await fetchKStartupPrograms({
        perPage: 100,
        onlyActive: true
      })
      kstartupPrograms = programs
      console.log(`[GovernmentPrograms Cron] K-Startup ${kstartupPrograms.length}개 수집`)
    } catch (error: any) {
      console.error('[GovernmentPrograms Cron] K-Startup 수집 실패:', error.message)
      errors.push(`kstartup: ${error.message}`)
    }

    // ========== 3. 데이터 변환 및 중복 제거 ==========
    // 기업마당 중복 제거
    const uniqueBizinfo = new Map()
    for (const p of bizinfoPrograms) {
      if (!uniqueBizinfo.has(p.pblancId)) {
        uniqueBizinfo.set(p.pblancId, p)
      }
    }

    // 변환
    const transformedBizinfo = Array.from(uniqueBizinfo.values()).map(transformBizinfoProgram)
    const transformedKStartup = kstartupPrograms.map(transformKStartupProgram)

    // 합치기
    const transformedPrograms = [...transformedBizinfo, ...transformedKStartup]
    console.log(`[GovernmentPrograms Cron] 총 ${transformedPrograms.length}개 변환 완료`)

    let insertedCount = 0
    let updatedCount = 0
    const newProgramIds: string[] = []

    for (const program of transformedPrograms) {
      // 기존 데이터 확인
      const { data: existing } = await (supabase as any)
        .from('government_programs')
        .select('id')
        .eq('program_id', program.program_id)
        .single()

      if (existing) {
        // 업데이트
        const { error } = await (supabase as any)
          .from('government_programs')
          .update({
            ...program,
            updated_at: new Date().toISOString(),
            fetched_at: new Date().toISOString()
          })
          .eq('program_id', program.program_id)

        if (!error) updatedCount++
      } else {
        // 새로 삽입
        const { data: inserted, error } = await (supabase as any)
          .from('government_programs')
          .insert({
            ...program,
            fetched_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (!error && inserted) {
          insertedCount++
          newProgramIds.push(inserted.id)
        }
      }
    }

    console.log(`[GovernmentPrograms Cron] 저장 완료: 신규 ${insertedCount}, 업데이트 ${updatedCount}`)

    // 새 공고가 있으면 구독자에게 알림 생성
    if (newProgramIds.length > 0) {
      await createNotificationsForNewPrograms(supabase, newProgramIds)
    }

    // 마감된 공고 정리 (30일 이상 지난 것)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: archivedCount } = await (supabase as any)
      .from('government_programs')
      .update({ archived: true })
      .lt('apply_end_date', thirtyDaysAgo.toISOString().split('T')[0])
      .eq('archived', false)
      .select('*', { count: 'exact', head: true })

    // 수집 로그 저장
    const stats = {
      sources: {
        bizinfo: transformedBizinfo.length,
        kstartup: transformedKStartup.length
      },
      total: transformedPrograms.length,
      inserted: insertedCount,
      updated: updatedCount,
      archived: archivedCount || 0,
      errors: errors.length > 0 ? errors : undefined
    }

    await (supabase as any)
      .from('cron_logs')
      .insert({
        job_name: 'government_programs_sync',
        status: 'success',
        details: stats
      })
      .single()

    return NextResponse.json({
      success: true,
      message: `수집 완료: 기업마당 ${transformedBizinfo.length}건, K-Startup ${transformedKStartup.length}건 (신규 ${insertedCount}, 업데이트 ${updatedCount})`,
      stats: {
        ...stats,
        newProgramIds
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[GovernmentPrograms Cron] 오류:', error)

    // 오류 로그 저장
    try {
      await (supabase as any)
        .from('cron_logs')
        .insert({
          job_name: 'government_programs_sync',
          status: 'error',
          details: { error: error.message }
        })
    } catch (logError) {
      console.error('[GovernmentPrograms Cron] 로그 저장 실패:', logError)
    }

    return NextResponse.json(
      { error: error.message || '수집 실패' },
      { status: 500 }
    )
  }
}

/**
 * 새 공고에 대해 구독자 알림 생성
 */
async function createNotificationsForNewPrograms(
  supabase: any,
  programIds: string[]
) {
  try {
    // 새 공고 정보 가져오기
    const { data: programs } = await supabase
      .from('government_programs')
      .select('id, title, category, hashtags')
      .in('id', programIds)

    if (!programs?.length) return

    // 모든 구독자 가져오기
    const { data: subscribers } = await supabase
      .from('government_program_subscriptions')
      .select('user_id, categories, keywords')
      .eq('push_enabled', true)

    if (!subscribers?.length) return

    // 각 공고에 대해 관련 구독자에게 알림 생성
    const notifications: any[] = []

    for (const program of programs) {
      for (const subscriber of subscribers) {
        // 카테고리 매칭 체크
        const categoryMatch =
          !subscriber.categories?.length ||
          subscriber.categories.includes(program.category)

        // 키워드 매칭 체크
        const keywordMatch =
          !subscriber.keywords?.length ||
          subscriber.keywords.some((kw: string) =>
            program.title?.toLowerCase().includes(kw.toLowerCase()) ||
            program.hashtags?.some((tag: string) =>
              tag.toLowerCase().includes(kw.toLowerCase())
            )
          )

        if (categoryMatch || keywordMatch) {
          notifications.push({
            user_id: subscriber.user_id,
            program_id: program.id,
            is_read: false,
            notified_at: new Date().toISOString()
          })
        }
      }
    }

    // 알림 일괄 삽입
    if (notifications.length > 0) {
      await supabase
        .from('government_program_notifications')
        .upsert(notifications, { onConflict: 'user_id,program_id' })

      console.log(`[GovernmentPrograms Cron] ${notifications.length}개 알림 생성`)
    }
  } catch (error) {
    console.error('[GovernmentPrograms Cron] 알림 생성 오류:', error)
  }
}
