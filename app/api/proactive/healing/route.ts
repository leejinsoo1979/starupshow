import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  diagnosePotentialIssues,
  startHealingSession,
  quickHeal,
} from '@/lib/proactive/self-healing'

// DB 타입이 아직 생성 전이므로 임시 타입 정의
interface HealingRecordRow {
  id: string
  agent_id: string
  issue_type: string
  issue_description: string
  issue_description_kr?: string
  issue_severity: string
  diagnosis: Record<string, unknown>
  healing_action: Record<string, unknown>[]
  healing_result?: Record<string, unknown>
  requires_approval: boolean
  approved_by?: string
  approved_at?: string
  status: string
  created_at: string
}

/**
 * 자가치유 기록 조회
 * GET /api/proactive/healing
 *
 * Query params:
 * - agentId: 에이전트 ID (필수)
 * - status: 상태 필터
 * - limit: 조회 개수 (기본 20)
 * - offset: 페이지네이션 오프셋
 */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)

  const agentId = searchParams.get('agentId')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId is required' },
      { status: 400 }
    )
  }

  try {
    let query = supabase
      .from('agent_healing_records' as any)
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data, count, error } = await query

    if (error) throw error

    // snake_case → camelCase 변환
    const records = ((data || []) as HealingRecordRow[]).map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      issueType: r.issue_type,
      issueDescription: r.issue_description,
      issueDescriptionKr: r.issue_description_kr,
      issueSeverity: r.issue_severity,
      diagnosis: r.diagnosis,
      healingAction: r.healing_action,
      healingResult: r.healing_result,
      requiresApproval: r.requires_approval,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      status: r.status,
      createdAt: r.created_at,
    }))

    return NextResponse.json({
      records,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error('[Healing API] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch healing records' },
      { status: 500 }
    )
  }
}

/**
 * 자가치유 트리거
 * POST /api/proactive/healing
 *
 * Body:
 * - agentId: 에이전트 ID
 * - issueType?: 이슈 타입 (자동 감지 가능)
 * - context?: 추가 컨텍스트
 * - quick?: boolean - 빠른 치유 (승인 없이 안전한 액션만)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, issueType, context, quick = false } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      )
    }

    // 빠른 치유 모드
    if (quick) {
      const success = await quickHeal(agentId, issueType || 'unknown', context)
      return NextResponse.json({
        success,
        mode: 'quick',
        message: success
          ? 'Quick healing completed'
          : 'Quick healing had no effect or failed',
      })
    }

    // 전체 진단 및 치유 세션 시작
    const diagnosis = await diagnosePotentialIssues(agentId, context)

    if (!diagnosis) {
      return NextResponse.json({
        success: true,
        message: 'No issues detected, agent is healthy',
        needsHealing: false,
      })
    }

    // 치유 세션 시작
    const session = await startHealingSession(agentId, diagnosis)

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to start healing session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      needsHealing: true,
      session: {
        id: session.recordId,
        status: session.status,
        requiresApproval: session.requiresApproval,
        actionsCount: session.actions.length,
        diagnosis: {
          issueType: diagnosis.issueType,
          severity: diagnosis.severity,
          description: diagnosis.description,
        },
      },
    })
  } catch (error) {
    console.error('[Healing API] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to trigger healing' },
      { status: 500 }
    )
  }
}
