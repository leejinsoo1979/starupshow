import { NextRequest, NextResponse } from 'next/server'
import { runBatchHeartbeat } from '@/lib/proactive/heartbeat-service'

/**
 * 능동적 에이전트 하트비트 스케줄러
 * GET /api/cron/proactive-heartbeat
 *
 * Vercel Cron 또는 외부 스케줄러에서 호출
 * 15분마다 모든 활성 에이전트에 대해 하트비트 실행
 *
 * vercel.json 설정:
 * {
 *   "crons": [{
 *     "path": "/api/cron/proactive-heartbeat",
 *     "schedule": "*\/15 * * * *"
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

  const startTime = Date.now()

  try {
    console.log('[Proactive Heartbeat] 배치 하트비트 시작:', new Date().toISOString())

    const { success, results, errors } = await runBatchHeartbeat()

    const duration = Date.now() - startTime

    // 통계 집계
    const stats = {
      totalAgents: results.length,
      totalPatternsDetected: results.reduce((sum, r) => sum + r.patternsDetected, 0),
      totalSuggestionsGenerated: results.reduce((sum, r) => sum + r.suggestionsGenerated, 0),
      totalIssuesDetected: results.reduce((sum, r) => sum + r.issuesDetected, 0),
      avgDurationMs: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.durationMs, 0) / results.length)
        : 0,
    }

    console.log('[Proactive Heartbeat] 완료:', {
      success,
      ...stats,
      totalDurationMs: duration,
      errors: errors.length,
    })

    return NextResponse.json({
      success,
      stats,
      duration,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Proactive Heartbeat] 실패:', errorMessage)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// POST도 지원 (수동 트리거용)
export async function POST(request: NextRequest) {
  return GET(request)
}
