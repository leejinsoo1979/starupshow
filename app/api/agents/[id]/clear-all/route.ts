export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE: 에이전트의 모든 대화 기록 삭제 (모든 사용자)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params
  const adminClient = createAdminClient()

  try {
    // 1. 모든 대화 세션 삭제 (CASCADE로 메시지도 삭제)
    const { error: convError } = await (adminClient as any)
      .from('agent_conversations')
      .delete()
      .eq('agent_id', agentId)

    if (convError) {
      console.error('Delete conversations error:', convError)
    }

    // 2. 워크 메모리도 삭제
    const { error: memError } = await (adminClient as any)
      .from('agent_work_memory')
      .delete()
      .eq('agent_id', agentId)

    if (memError) {
      console.error('Delete work memory error:', memError)
    }

    // 3. 장기 메모리도 삭제
    const { error: longMemError } = await (adminClient as any)
      .from('long_term_memories')
      .delete()
      .eq('owner_agent_id', agentId)

    if (longMemError) {
      console.error('Delete long term memory error:', longMemError)
    }

    console.log(`[ClearAll] Cleared all memory for agent ${agentId}`)

    return NextResponse.json({
      success: true,
      message: 'All conversations and memories cleared'
    })
  } catch (error) {
    console.error('Clear all error:', error)
    return NextResponse.json({ error: 'Failed to clear' }, { status: 500 })
  }
}
