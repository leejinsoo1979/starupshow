export const dynamic = 'force-dynamic'
import { createClientForApi, getAuthUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateNodeDependencyInput } from '@/types/database'

// POST /api/projects/[id]/roadmap/dependencies - 의존성(엣지) 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateNodeDependencyInput = await request.json()
    const { source_node_id, target_node_id, dependency_type = 'finish_to_start', condition } = body

    // 같은 노드 연결 방지
    if (source_node_id === target_node_id) {
      return NextResponse.json({ error: 'Cannot create self-dependency' }, { status: 400 })
    }

    // 두 노드가 같은 프로젝트에 속하는지 확인
    const { data: nodes, error: nodesError } = await (supabase as any)
      .from('roadmap_nodes')
      .select('id, project_id')
      .in('id', [source_node_id, target_node_id])

    if (nodesError || !nodes || nodes.length !== 2) {
      return NextResponse.json({ error: 'Invalid node IDs' }, { status: 400 })
    }

    const projectIds = new Set(nodes.map((n: any) => n.project_id))
    if (projectIds.size !== 1 || !projectIds.has(params.id)) {
      return NextResponse.json({ error: 'Nodes must belong to the same project' }, { status: 400 })
    }

    // 순환 의존성 체크
    const hasCycle = await checkCyclicDependency(supabase, source_node_id, target_node_id)
    if (hasCycle) {
      return NextResponse.json({ error: 'Cyclic dependency detected' }, { status: 400 })
    }

    // 의존성 생성
    const { data: dependency, error } = await (supabase as any)
      .from('node_dependencies')
      .insert({
        source_node_id,
        target_node_id,
        dependency_type,
        condition: condition || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Dependency already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // target 노드 상태 업데이트 (ready → pending)
    await (supabase as any)
      .from('roadmap_nodes')
      .update({ status: 'pending' })
      .eq('id', target_node_id)
      .eq('status', 'ready')

    // React Flow 엣지 형식으로 반환
    const edge = {
      id: dependency.id,
      source: dependency.source_node_id,
      target: dependency.target_node_id,
      type: 'smoothstep',
      animated: true,
      data: {
        dependency_type: dependency.dependency_type,
        condition: dependency.condition,
      },
    }

    return NextResponse.json({ edge, raw: dependency }, { status: 201 })
  } catch (error) {
    console.error('Dependency POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/roadmap/dependencies - 의존성 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dependencyId = searchParams.get('id')
    const sourceId = searchParams.get('source')
    const targetId = searchParams.get('target')

    let query = (supabase as any).from('node_dependencies').delete()

    if (dependencyId) {
      query = query.eq('id', dependencyId)
    } else if (sourceId && targetId) {
      query = query.eq('source_node_id', sourceId).eq('target_node_id', targetId)
    } else {
      return NextResponse.json({ error: 'Must provide id or source+target' }, { status: 400 })
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // target 노드의 의존성을 다시 체크하여 ready로 변경할지 결정
    if (targetId) {
      const { data: remainingDeps } = await (supabase as any)
        .from('node_dependencies')
        .select('source_node_id')
        .eq('target_node_id', targetId)

      if (!remainingDeps || remainingDeps.length === 0) {
        // 더 이상 의존성이 없으면 ready로
        await (supabase as any)
          .from('roadmap_nodes')
          .update({ status: 'ready' })
          .eq('id', targetId)
          .eq('status', 'pending')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dependency DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 순환 의존성 체크 (DFS)
async function checkCyclicDependency(
  supabase: any,
  sourceId: string,
  targetId: string
): Promise<boolean> {
  // source에서 시작해서 target에 도달할 수 있는지 확인
  // (target → source 경로가 있으면 source → target 추가 시 순환 발생)

  const visited = new Set<string>()
  const stack = [targetId]

  while (stack.length > 0) {
    const current = stack.pop()!

    if (current === sourceId) {
      return true // 순환 발견
    }

    if (visited.has(current)) continue
    visited.add(current)

    // current의 후속 노드들 조회
    const { data: deps } = await supabase
      .from('node_dependencies')
      .select('target_node_id')
      .eq('source_node_id', current)

    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep.target_node_id)) {
          stack.push(dep.target_node_id)
        }
      }
    }
  }

  return false
}
