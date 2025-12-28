export const dynamic = 'force-dynamic'
import { createClientForApi, getAuthUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateRoadmapNodeInput } from '@/types/database'

// GET /api/projects/[id]/roadmap/[nodeId] - 단일 노드 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const supabase = await createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: node, error } = await (supabase as any)
      .from('roadmap_nodes')
      .select('*')
      .eq('id', params.nodeId)
      .eq('project_id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 의존성 조회 (이 노드가 의존하는 노드들)
    const { data: dependencies } = await (supabase as any)
      .from('node_dependencies')
      .select('*')
      .eq('target_node_id', params.nodeId)

    // 선행 노드 정보 조회
    const sourceNodeIds = dependencies?.map((d: any) => d.source_node_id) || []
    let sourceNodes: any[] = []
    if (sourceNodeIds.length > 0) {
      const { data } = await (supabase as any)
        .from('roadmap_nodes')
        .select('id, title, status')
        .in('id', sourceNodeIds)
      sourceNodes = data || []
    }

    // 의존성에 소스 노드 정보 추가
    const depsWithSource = dependencies?.map((d: any) => ({
      ...d,
      source_node: sourceNodes.find((n: any) => n.id === d.source_node_id)
    })) || []

    // 후속 노드들 (이 노드에 의존하는 노드들)
    const { data: dependents } = await (supabase as any)
      .from('node_dependencies')
      .select('*')
      .eq('source_node_id', params.nodeId)

    // 타겟 노드 정보 조회
    const targetNodeIds = dependents?.map((d: any) => d.target_node_id) || []
    let targetNodes: any[] = []
    if (targetNodeIds.length > 0) {
      const { data } = await (supabase as any)
        .from('roadmap_nodes')
        .select('id, title, status')
        .in('id', targetNodeIds)
      targetNodes = data || []
    }

    // 의존성에 타겟 노드 정보 추가
    const depsWithTarget = dependents?.map((d: any) => ({
      ...d,
      target_node: targetNodes.find((n: any) => n.id === d.target_node_id)
    })) || []

    // 실행 로그 조회
    const { data: logs } = await (supabase as any)
      .from('node_execution_logs')
      .select('*')
      .eq('node_id', params.nodeId)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      ...node,
      dependencies: depsWithSource,
      dependents: depsWithTarget,
      logs: logs || [],
    })
  } catch (error) {
    console.error('Node GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/projects/[id]/roadmap/[nodeId] - 노드 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const supabase = await createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateRoadmapNodeInput = await request.json()

    // 상태 변경 시 추가 처리
    const updateData: any = { ...body }

    if (body.status === 'running' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString()
    }

    if (body.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: node, error } = await (supabase as any)
      .from('roadmap_nodes')
      .update(updateData)
      .eq('id', params.nodeId)
      .eq('project_id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 로그 기록
    if (body.status) {
      await (supabase as any).from('node_execution_logs').insert({
        node_id: params.nodeId,
        log_type: 'info',
        message: `Status changed to ${body.status}`,
        created_by: user.id,
      })
    }

    return NextResponse.json(node)
  } catch (error) {
    console.error('Node PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/roadmap/[nodeId] - 노드 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const supabase = await createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 의존성도 함께 삭제됨 (ON DELETE CASCADE)
    const { error } = await (supabase as any)
      .from('roadmap_nodes')
      .delete()
      .eq('id', params.nodeId)
      .eq('project_id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Node DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
