export const dynamic = 'force-dynamic'
import { createClientForApi, getAuthUser, DEV_USER } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateRoadmapNodeInput, CreateNodeDependencyInput } from '@/types/database'

// GET /api/projects/[id]/roadmap - 프로젝트의 모든 노드와 의존성 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    // 노드 조회 (관계 없이 기본 데이터만)
    const { data: nodes, error: nodesError } = await (supabase as any)
      .from('roadmap_nodes')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (nodesError) {
      console.error('Nodes fetch error:', nodesError)
      return NextResponse.json({ error: nodesError.message }, { status: 500 })
    }

    // 의존성 조회
    const nodeIds = nodes?.map((n: any) => n.id) || []
    let dependencies: any[] = []

    if (nodeIds.length > 0) {
      const { data: deps, error: depsError } = await (supabase as any)
        .from('node_dependencies')
        .select('*')
        .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)

      if (depsError) {
        console.error('Dependencies fetch error:', depsError)
      } else {
        dependencies = deps || []
      }
    }

    // React Flow 형식으로 변환
    const flowNodes = (nodes || []).map((node: any) => ({
      id: node.id,
      type: 'roadmapNode',
      position: { x: node.position_x, y: node.position_y },
      data: {
        ...node,
        label: node.title,
      },
    }))

    const flowEdges = dependencies.map((dep: any) => ({
      id: dep.id,
      source: dep.source_node_id,
      target: dep.target_node_id,
      type: 'smoothstep',
      animated: true,
      data: {
        dependency_type: dep.dependency_type,
        condition: dep.condition,
      },
    }))

    return NextResponse.json({
      nodes: flowNodes,
      edges: flowEdges,
      raw: {
        nodes: nodes || [],
        dependencies,
      },
    })
  } catch (error) {
    console.error('Roadmap GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/roadmap - 새 노드 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
    const body: CreateRoadmapNodeInput = await request.json()

    // 노드 생성 (개발 모드에서는 created_by 생략)
    const insertData: any = {
      project_id: projectId,
      title: body.title,
      description: body.description || null,
      goal: body.goal || null,
      position_x: body.position_x || 0,
      position_y: body.position_y || 0,
      agent_type: body.agent_type || 'general',
      assigned_agent_id: body.assigned_agent_id || null,
      automation_level: body.automation_level || 'assisted',
      input_schema: body.input_schema || {},
      output_schema: body.output_schema || {},
      priority: body.priority || 0,
      estimated_hours: body.estimated_hours || null,
      assignee_id: body.assignee_id || null,
    }

    // 실제 사용자일 때만 created_by 설정
    if (!DEV_USER) {
      insertData.created_by = user.id
    }

    const { data: node, error } = await (supabase as any)
      .from('roadmap_nodes')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Node create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // React Flow 형식으로 반환
    const flowNode = {
      id: node.id,
      type: 'roadmapNode',
      position: { x: node.position_x, y: node.position_y },
      data: {
        ...node,
        label: node.title,
      },
    }

    return NextResponse.json({ node: flowNode, raw: node }, { status: 201 })
  } catch (error) {
    console.error('Roadmap POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/projects/[id]/roadmap - 여러 노드 위치 일괄 업데이트 (드래그 후)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { nodes } = body as { nodes: Array<{ id: string; position: { x: number; y: number } }> }

    // 일괄 업데이트
    const updates = nodes.map((node: any) =>
      (supabase as any)
        .from('roadmap_nodes')
        .update({
          position_x: node.position.x,
          position_y: node.position.y,
        })
        .eq('id', node.id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Roadmap PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
