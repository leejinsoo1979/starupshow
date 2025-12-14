import { createClientForApi, getAuthUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/projects/[id]/roadmap/[nodeId]/approve - AI 추천 승인 (assisted 모드)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const supabase = createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { approved, output_data, feedback } = body

    // 노드 조회
    const { data: node, error: nodeError } = await (supabase as any)
      .from('roadmap_nodes')
      .select('*')
      .eq('id', params.nodeId)
      .eq('project_id', params.id)
      .single()

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    if (approved) {
      // 승인: 완료 처리
      await (supabase as any)
        .from('roadmap_nodes')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          output_data: output_data || (node as any).ai_analysis?.expected_output || {},
        })
        .eq('id', params.nodeId)

      await (supabase as any).from('node_execution_logs').insert({
        node_id: params.nodeId,
        log_type: 'user_action',
        message: 'AI suggestion approved by user',
        details: { approved_by: user.id, output_data, feedback },
        created_by: user.id,
      })

      return NextResponse.json({
        status: 'completed',
        message: 'Node completed successfully',
      })
    } else {
      // 거부: 다시 대기 상태로
      await (supabase as any)
        .from('roadmap_nodes')
        .update({
          status: 'ready',
          ai_suggestion: null,
          ai_analysis: null,
        })
        .eq('id', params.nodeId)

      await (supabase as any).from('node_execution_logs').insert({
        node_id: params.nodeId,
        log_type: 'user_action',
        message: 'AI suggestion rejected by user',
        details: { rejected_by: user.id, feedback },
        created_by: user.id,
      })

      return NextResponse.json({
        status: 'ready',
        message: 'AI suggestion rejected. Node ready for re-execution.',
      })
    }
  } catch (error: any) {
    console.error('Node approve error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
