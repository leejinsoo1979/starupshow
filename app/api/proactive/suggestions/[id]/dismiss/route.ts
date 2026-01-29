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
      .from('proactive_suggestions' as any)
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    const suggestionData = suggestion as any

    // 이미 처리된 제안인지 확인
    if (suggestionData.status !== 'pending' && suggestionData.status !== 'delivered') {
      return NextResponse.json(
        { error: `Suggestion already ${suggestionData.status}` },
        { status: 400 }
      )
    }

    // 제안 상태 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQuery = supabase.from('proactive_suggestions' as any)
    const { error: updateError } = await (updateQuery.update as any)({
      status: 'dismissed',
      responded_at: new Date().toISOString(),
      metadata: reason ? { dismissReason: reason } : undefined,
    }).eq('id', id)

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
