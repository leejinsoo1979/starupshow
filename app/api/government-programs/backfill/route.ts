// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { scrapeBizinfoDetail } from '@/lib/government/bizinfo'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분

/**
 * 기업마당 콘텐츠 백필 API
 * GET /api/government-programs/backfill?limit=200
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

  // Admin 클라이언트 사용 (RLS 우회)
  const supabase = createAdminClient()

  // content가 NULL인 기업마당 프로그램 조회
  const { data: needsScraping, error } = await (supabase as any)
    .from('government_programs')
    .select('id, title, detail_url')
    .eq('source', 'bizinfo')
    .is('content', null)
    .not('detail_url', 'is', null)
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!needsScraping || needsScraping.length === 0) {
    return NextResponse.json({
      message: '백필할 항목이 없습니다.',
      total: 0,
      success: 0,
      failed: 0
    })
  }

  let successCount = 0
  let failedCount = 0
  const results: any[] = []

  for (const program of needsScraping) {
    if (!program.detail_url) {
      failedCount++
      continue
    }

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

        const { error: updateError } = await (supabase as any)
          .from('government_programs')
          .update(updateData)
          .eq('id', program.id)

        if (!updateError) {
          successCount++
          results.push({ id: program.id, title: program.title, status: 'success' })
        } else {
          failedCount++
          results.push({ id: program.id, title: program.title, status: 'update_failed', error: updateError.message })
        }
      } else {
        failedCount++
        results.push({ id: program.id, title: program.title, status: 'no_content' })
      }

      // Rate limiting - 300ms 간격
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (e: any) {
      failedCount++
      results.push({ id: program.id, title: program.title, status: 'error', error: e.message })
    }
  }

  // 남은 항목 수 확인
  const { count: remaining } = await (supabase as any)
    .from('government_programs')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'bizinfo')
    .is('content', null)
    .not('detail_url', 'is', null)

  return NextResponse.json({
    message: '백필 완료',
    total: needsScraping.length,
    success: successCount,
    failed: failedCount,
    remaining: remaining || 0,
    results: results.slice(0, 20) // 처음 20개만 반환
  })
}
