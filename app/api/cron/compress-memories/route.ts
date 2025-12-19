/**
 * Memory Compression Cron Job
 *
 * Vercel Cron으로 호출되어 메모리 압축 실행
 * 설정: vercel.json의 crons 배열에 추가
 *
 * 예시:
 * "crons": [{
 *   "path": "/api/cron/compress-memories",
 *   "schedule": "0 3 * * *"  // 매일 오전 3시
 * }]
 */

import { NextRequest, NextResponse } from 'next/server'
import { runFullScheduler } from '@/lib/memory/agent-compression-scheduler'

// Vercel Cron 인증 확인
function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron은 CRON_SECRET 헤더를 사용
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // CRON_SECRET이 설정되어 있으면 검증
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`
  }

  // 개발 환경에서는 항상 허용
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // Vercel 환경에서 Cron이 호출하면 x-vercel-cron-secret 헤더가 있음
  const vercelCronSecret = request.headers.get('x-vercel-cron-secret')
  if (vercelCronSecret) {
    return true
  }

  return false
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300  // 5분 타임아웃

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting memory compression job')

    const result = await runFullScheduler()

    console.log('[Cron] Compression job completed:', result)

    return NextResponse.json({
      success: true,
      result: {
        compression: {
          agentsProcessed: result.compression.agentsProcessed,
          memoriesCompressed: result.compression.memoriesCompressed,
          duration: result.compression.duration,
          errors: result.compression.errors.length,
        },
        dailySummary: {
          agentsProcessed: result.dailySummary.agentsProcessed,
          summariesGenerated: result.dailySummary.dailySummariesGenerated,
          duration: result.dailySummary.duration,
          errors: result.dailySummary.errors.length,
        },
        cleanup: {
          archived: result.cleanup.archived,
          errors: result.cleanup.errors.length,
        },
      },
    })
  } catch (error) {
    console.error('[Cron] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST도 지원 (수동 트리거용)
export async function POST(request: NextRequest) {
  return GET(request)
}
