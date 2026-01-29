import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * 제안 무시
 * POST /api/proactive/suggestions/[id]/dismiss
 *
 * Body (optional):
 * - reason: string - 무시 사유
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient()
  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    // 제안 조회
    const { data: suggestion, error: fetchError } = await supabase
      .from('proactive_suggestions')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    // 이미 처리된 제안인지 확인
    if (suggestion.status !== 'pending' && suggestion.status !== 'delivered') {
      return NextResponse.json(
        { error: `Suggestion already ${suggestion.status}` },
        { status: 400 }
      )
    }

    // 제안 상태 업데이트
    const { error: updateError } = await supabase
      .from('proactive_suggestions')
      .update({
        status: 'dismissed',
        responded_at: new Date().toISOString(),
        metadata: reason ? { dismissReason: reason } : undefined,
      })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      status: 'dismissed',
    })
  } catch (error) {
    console.error('[Suggestions API] Dismiss failed:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss suggestion' },
      { status: 500 }
    )
  }
}
