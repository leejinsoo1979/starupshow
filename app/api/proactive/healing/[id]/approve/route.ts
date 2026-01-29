import { NextRequest, NextResponse } from 'next/server'
import {
  approveHealingSession,
  rejectHealingSession,
  getHealingStatus,
} from '@/lib/proactive/self-healing'
import type { AgentHealingRecord } from '@/lib/proactive/types'

/**
 * 치유 상태 조회
 * GET /api/proactive/healing/[id]/approve
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const record = await getHealingStatus(id)

    if (!record) {
      return NextResponse.json(
        { error: 'Healing record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: record.id,
      agentId: record.agentId,
      status: record.status,
      requiresApproval: record.requiresApproval,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt,
      issueType: record.issueType,
      issueSeverity: record.issueSeverity,
      diagnosis: record.diagnosis,
      healingAction: record.healingAction,
      healingResult: record.healingResult,
    })
  } catch (error) {
    console.error('[Healing Approve API] GET failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch healing status' },
      { status: 500 }
    )
  }
}

/**
 * 치유 승인/거부
 * POST /api/proactive/healing/[id]/approve
 *
 * Body:
 * - action: 'approve' | 'reject'
 * - userId: 승인/거부한 사용자 ID
 * - reason?: 거부 사유 (거부 시)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { action, userId, reason } = body

    if (!action || !userId) {
      return NextResponse.json(
        { error: 'action and userId are required' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // 현재 상태 확인
    const record = await getHealingStatus(id)

    if (!record) {
      return NextResponse.json(
        { error: 'Healing record not found' },
        { status: 404 }
      )
    }

    if (record.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: `Cannot ${action} record in status: ${record.status}` },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      const session = await approveHealingSession(id, userId)

      if (!session) {
        return NextResponse.json(
          { error: 'Failed to approve healing session' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        session: {
          id: session.recordId,
          status: session.status,
          executedActions: session.executedActions.length,
          successfulActions: session.executedActions.filter((a) => a.success).length,
        },
      })
    } else {
      const success = await rejectHealingSession(id, userId, reason)

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to reject healing session' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'rejected',
        reason,
      })
    }
  } catch (error) {
    console.error('[Healing Approve API] POST failed:', error)
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}
