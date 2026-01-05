import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  fetchBizinfoPrograms,
  transformBizinfoProgram,
  scrapeBizinfoDetail,
  BIZINFO_CATEGORIES,
  type BizinfoCategory
} from '@/lib/government/bizinfo'
import {
  fetchBizinfoEvents,
  transformBizinfoEvent
} from '@/lib/government/bizinfo-events'
import {
  fetchKStartupPrograms,
  transformKStartupProgram,
  scrapeKStartupDetail
} from '@/lib/government/kstartup'
import {
  fetchSemasPrograms,
  transformSemasProgram,
  SEMAS_CATEGORIES,
  type SemasCategory
} from '@/lib/government/semas'
import { notifyMatchedUsers, sendEndingSoonNotifications } from '@/lib/notifications'

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

  const supabase = createAdminClient()

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
    // 카테고리 필터 없이 전체 데이터 수집 (API가 카테고리 필터를 지원하지 않음)
    try {
      // 페이지별로 수집 (최대 500개까지)
      for (let page = 1; page <= 5; page++) {
        const programs = await fetchBizinfoPrograms({
          searchCount: 100,
          pageIndex: page
        })

        if (programs.length === 0) break // 더 이상 데이터 없음

        bizinfoPrograms.push(...programs)
        console.log(`[GovernmentPrograms Cron] 기업마당 페이지 ${page}: ${programs.length}개`)

        // Rate limiting 방지
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    } catch (error: any) {
      console.error('[GovernmentPrograms Cron] 기업마당 수집 실패:', error.message)
      errors.push(`bizinfo: ${error.message}`)
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

    // ========== 3. 소진공 데이터 수집 ==========
    let semasPrograms: any[] = []

    console.log('[GovernmentPrograms Cron] 소진공 수집 시작...')
    for (const catId of Object.keys(SEMAS_CATEGORIES) as SemasCategory[]) {
      try {
        const programs = await fetchSemasPrograms({
          category: catId,
          numOfRows: 50,
          onlyActive: true
        })
        semasPrograms.push(...programs)

        // Rate limiting 방지
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error: any) {
        console.error(`[GovernmentPrograms Cron] 소진공 ${catId} 수집 실패:`, error.message)
        errors.push(`semas-${catId}: ${error.message}`)
      }
    }
    console.log(`[GovernmentPrograms Cron] 소진공 ${semasPrograms.length}개 수집`)

    // ========== 4. 행사정보 수집 ==========
    let bizinfoEvents: any[] = []

    console.log('[GovernmentPrograms Cron] 행사정보 수집 시작...')
    try {
      const events = await fetchBizinfoEvents({ searchCount: 100 })
      bizinfoEvents = events
      console.log(`[GovernmentPrograms Cron] 행사정보 ${bizinfoEvents.length}개 수집`)
    } catch (error: any) {
      console.error('[GovernmentPrograms Cron] 행사정보 수집 실패:', error.message)
      errors.push(`bizinfo_event: ${error.message}`)
    }

    // ========== 5. 데이터 변환 및 중복 제거 ==========
    // 기업마당 중복 제거
    const uniqueBizinfo = new Map()
    for (const p of bizinfoPrograms) {
      if (!uniqueBizinfo.has(p.pblancId)) {
        uniqueBizinfo.set(p.pblancId, p)
      }
    }

    // 소진공 중복 제거
    const uniqueSemas = new Map()
    for (const p of semasPrograms) {
      const key = p.pbancSn || p.pbancNm
      if (!uniqueSemas.has(key)) {
        uniqueSemas.set(key, p)
      }
    }

    // 행사정보 중복 제거
    const uniqueEvents = new Map()
    for (const e of bizinfoEvents) {
      if (!uniqueEvents.has(e.eventInfoId)) {
        uniqueEvents.set(e.eventInfoId, e)
      }
    }

    // 변환
    const transformedBizinfo = Array.from(uniqueBizinfo.values()).map(transformBizinfoProgram)
    const transformedKStartup = kstartupPrograms.map(transformKStartupProgram)
    const transformedSemas = Array.from(uniqueSemas.values()).map(transformSemasProgram)
    const transformedEvents = Array.from(uniqueEvents.values()).map(transformBizinfoEvent)

    // 합치기
    const transformedPrograms = [...transformedBizinfo, ...transformedKStartup, ...transformedSemas, ...transformedEvents]
    console.log(`[GovernmentPrograms Cron] 총 ${transformedPrograms.length}개 변환 완료 (기업마당: ${transformedBizinfo.length}, K-Startup: ${transformedKStartup.length}, 소진공: ${transformedSemas.length}, 행사: ${transformedEvents.length})`)

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

    // ========== 6. K-Startup content 보강 (스크래핑) ==========
    // API에서 상세 데이터가 없는 경우 상세페이지 크롤링으로 보강
    // 시간 제한을 위해 최대 30개만 처리
    let scrapedCount = 0
    const maxScrape = 30

    console.log('[GovernmentPrograms Cron] K-Startup 스크래핑 보강 시작...')

    // content가 NULL인 K-Startup 프로그램 조회
    const { data: needsScraping } = await (supabase as any)
      .from('government_programs')
      .select('id, detail_url')
      .eq('source', 'kstartup')
      .is('content', null)
      .not('detail_url', 'is', null)
      .limit(maxScrape)

    if (needsScraping && needsScraping.length > 0) {
      for (const program of needsScraping) {
        if (!program.detail_url?.includes('pbancSn=')) continue

        try {
          const scraped = await scrapeKStartupDetail(program.detail_url)

          if (scraped?.content) {
            const updateData: any = {
              content: scraped.content,
              updated_at: new Date().toISOString()
            }
            if (scraped.attachments && scraped.attachments.length > 0) {
              updateData.attachments_primary = scraped.attachments
            }

            await (supabase as any)
              .from('government_programs')
              .update(updateData)
              .eq('id', program.id)

            scrapedCount++
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (e) {
          // 스크래핑 실패 무시
        }
      }
      console.log(`[GovernmentPrograms Cron] K-Startup 스크래핑 보강: ${scrapedCount}/${needsScraping.length}개 성공`)
    }

    // ========== 7. 기업마당 content 보강 (스크래핑) ==========
    let bizinfoScrapedCount = 0
    const maxBizinfoScrape = 30

    console.log('[GovernmentPrograms Cron] 기업마당 스크래핑 보강 시작...')

    // content가 NULL인 기업마당 프로그램 조회
    const { data: bizinfoNeedsScraping } = await (supabase as any)
      .from('government_programs')
      .select('id, detail_url')
      .eq('source', 'bizinfo')
      .is('content', null)
      .not('detail_url', 'is', null)
      .limit(maxBizinfoScrape)

    if (bizinfoNeedsScraping && bizinfoNeedsScraping.length > 0) {
      for (const program of bizinfoNeedsScraping) {
        if (!program.detail_url) continue

        try {
          const scraped = await scrapeBizinfoDetail(program.detail_url)

          if (scraped?.content) {
            const updateData: any = {
              content: scraped.content,
              updated_at: new Date().toISOString()
            }
            if (scraped.attachments && scraped.attachments.length > 0) {
              updateData.attachments_primary = scraped.attachments
            }

            await (supabase as any)
              .from('government_programs')
              .update(updateData)
              .eq('id', program.id)

            bizinfoScrapedCount++
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (e) {
          // 스크래핑 실패 무시
        }
      }
      console.log(`[GovernmentPrograms Cron] 기업마당 스크래핑 보강: ${bizinfoScrapedCount}/${bizinfoNeedsScraping.length}개 성공`)
    }

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
        kstartup: transformedKStartup.length,
        semas: transformedSemas.length,
        bizinfo_event: transformedEvents.length
      },
      total: transformedPrograms.length,
      inserted: insertedCount,
      updated: updatedCount,
      scraped: {
        kstartup: scrapedCount,
        bizinfo: bizinfoScrapedCount
      },
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
      message: `수집 완료: 기업마당 ${transformedBizinfo.length}건, K-Startup ${transformedKStartup.length}건, 소진공 ${transformedSemas.length}건, 행사 ${transformedEvents.length}건 (신규 ${insertedCount}, 업데이트 ${updatedCount})`,
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
 * 새 공고에 대해 에이전트 알림 발송
 * - notification_queue 테이블에 추가
 * - 클라이언트에서 Realtime으로 구독하여 AgentNotificationPopup 표시
 */
async function createNotificationsForNewPrograms(
  supabase: any,
  programIds: string[]
) {
  try {
    let totalNotified = 0
    let totalFailed = 0

    for (const programId of programIds) {
      // 매칭 점수 70점 이상 사용자에게 알림 발송
      const result = await notifyMatchedUsers(programId, 70)
      totalNotified += result.notified
      totalFailed += result.failed

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`[GovernmentPrograms Cron] 에이전트 알림 발송: ${totalNotified}명 성공, ${totalFailed}명 실패`)

    // 마감 임박 공고 알림도 함께 발송
    const endingSoonResult = await sendEndingSoonNotifications(7)
    console.log(`[GovernmentPrograms Cron] 마감 임박 알림: ${endingSoonResult.programsChecked}건 확인, ${endingSoonResult.notificationsSent}건 발송`)

  } catch (error) {
    console.error('[GovernmentPrograms Cron] 알림 발송 오류:', error)
  }
}
