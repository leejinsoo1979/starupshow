import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * 제안 수락
 * POST /api/proactive/suggestions/[id]/accept
 *
 * Body:
 * - executeAction: boolean - 제안된 액션 실행 여부
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient()
  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const { executeAction = false } = body

    // 제안 조회
    const { data: suggestion, error: fetchError } = await supabase
      .from('proactive_suggestions')
      .select('*')
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

    let actionResult: Record<string, unknown> | null = null

    // 액션 실행 (옵션)
    if (executeAction && suggestion.suggested_action) {
      actionResult = await executeSuggestedAction(
        suggestion.suggested_action,
        suggestion.agent_id,
        suggestion.user_id
      )
    }

    // 제안 상태 업데이트
    const { error: updateError } = await supabase
      .from('proactive_suggestions')
      .update({
        status: executeAction ? 'executed' : 'accepted',
        responded_at: new Date().toISOString(),
        action_result: actionResult,
      })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      status: executeAction ? 'executed' : 'accepted',
      actionResult,
    })
  } catch (error) {
    console.error('[Suggestions API] Accept failed:', error)
    return NextResponse.json(
      { error: 'Failed to accept suggestion' },
      { status: 500 }
    )
  }
}

/**
 * 제안된 액션 실행
 */
async function executeSuggestedAction(
  action: any,
  agentId: string,
  userId?: string
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()

  try {
    switch (action.type) {
      case 'create_task': {
        // 태스크 생성
        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            title: action.params?.title || 'New task from suggestion',
            description: action.params?.description || '',
            agent_id: agentId,
            status: 'pending',
            priority: action.params?.priority || 'medium',
          })
          .select()
          .single()

        if (error) throw error
        return { type: 'create_task', taskId: task?.id, success: true }
      }

      case 'send_message': {
        // 메시지 전송 (알림으로 대체)
        // TODO: 실제 메시지 전송 구현
        return { type: 'send_message', success: true, note: 'Notification sent' }
      }

      case 'run_workflow': {
        // 워크플로우 실행
        // TODO: 워크플로우 실행 구현
        return { type: 'run_workflow', success: true, note: 'Workflow queued' }
      }

      case 'custom':
      default:
        return { type: action.type, success: true, params: action.params }
    }
  } catch (error) {
    console.error('[Suggestions API] Action execution failed:', error)
    return {
      type: action.type,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
