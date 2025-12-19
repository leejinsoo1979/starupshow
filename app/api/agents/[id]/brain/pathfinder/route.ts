export const dynamic = 'force-dynamic'

/**
 * Brain Map - Pathfinder API (두 노드 간 경로 탐색)
 * GET /api/agents/:agentId/brain/pathfinder?from=...&to=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import type { BrainTrace, TraceStep, StepType, BrainNode, BrainEdge, NodeType } from '@/types/brain-map'

// 그래프 데이터 로드 (graph API와 동일한 로직)
async function loadGraphData(supabase: any, agentId: string) {
  const nodes: BrainNode[] = []
  const edges: BrainEdge[] = []

  const logTypeToNodeType: Record<string, NodeType> = {
    'conversation': 'memory',
    'task_work': 'task',
    'decision': 'decision',
    'analysis': 'concept',
    'learning': 'skill',
    'collaboration': 'meeting',
    'error': 'memory',
    'milestone': 'decision',
  }

  const knowledgeTypeToNodeType: Record<string, NodeType> = {
    'project': 'doc',
    'team': 'person',
    'domain': 'concept',
    'preference': 'skill',
    'procedure': 'tool',
    'decision_rule': 'decision',
    'lesson_learned': 'memory',
  }

  // 1. agent_work_logs에서 노드 생성
  const { data: workLogs } = await supabase
    .from('agent_work_logs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (workLogs) {
    workLogs.forEach((log: any) => {
      nodes.push({
        id: log.id,
        type: logTypeToNodeType[log.log_type] || 'memory',
        title: log.title || `${log.log_type} 로그`,
        summary: log.summary || log.content?.substring(0, 200),
        createdAt: new Date(log.created_at).getTime(),
        importance: log.importance || 5,
        confidence: 0.9,
        tags: log.tags || [],
        clusterId: log.project_id ? `project-${log.project_id}` : undefined,
        source: {
          kind: log.room_id ? 'chat' : 'tool',
          ref: log.room_id || log.task_id,
        },
      })
    })
  }

  // 2. agent_knowledge에서 노드 생성
  const { data: knowledge } = await supabase
    .from('agent_knowledge')
    .select('*')
    .eq('agent_id', agentId)
    .order('use_count', { ascending: false })
    .limit(60)

  if (knowledge) {
    knowledge.forEach((k: any) => {
      nodes.push({
        id: k.id,
        type: knowledgeTypeToNodeType[k.knowledge_type] || 'concept',
        title: k.subject,
        summary: k.content?.substring(0, 200),
        createdAt: new Date(k.created_at).getTime(),
        updatedAt: k.updated_at ? new Date(k.updated_at).getTime() : undefined,
        importance: Math.min(10, Math.floor(k.use_count / 5) + 5),
        confidence: k.confidence || 0.8,
        tags: k.tags || [],
        clusterId: k.project_id ? `project-${k.project_id}` : `knowledge-${k.knowledge_type}`,
        source: {
          kind: 'tool',
          ref: k.id,
        },
      })
    })
  }

  // 3. agent_commits에서 노드 생성
  const { data: commits } = await supabase
    .from('agent_commits')
    .select('*')
    .eq('agent_id', agentId)
    .order('period_end', { ascending: false })
    .limit(40)

  if (commits) {
    commits.forEach((c: any) => {
      nodes.push({
        id: c.id,
        type: 'meeting' as NodeType,
        title: c.title,
        summary: c.summary?.substring(0, 200),
        createdAt: new Date(c.created_at).getTime(),
        importance: c.commit_type === 'milestone' ? 10 : (c.commit_type === 'weekly' ? 7 : 5),
        confidence: 1.0,
        tags: c.stats?.key_topics || [],
        clusterId: `commit-${c.commit_type}`,
        source: {
          kind: 'tool',
          ref: c.id,
        },
      })
    })
  }

  // 4. 엣지 생성 - 같은 태그/클러스터 기반 연결
  if (nodes.length > 0) {
    let edgeId = 0

    // 태그 기반 연결
    const tagMap = new Map<string, string[]>()
    nodes.forEach(node => {
      node.tags?.forEach(tag => {
        if (!tagMap.has(tag)) tagMap.set(tag, [])
        tagMap.get(tag)!.push(node.id)
      })
    })

    tagMap.forEach((nodeIds) => {
      for (let i = 0; i < nodeIds.length - 1; i++) {
        for (let j = i + 1; j < Math.min(i + 3, nodeIds.length); j++) {
          edges.push({
            id: `edge-tag-${edgeId++}`,
            source: nodeIds[i],
            target: nodeIds[j],
            type: 'related',
            weight: 0.6,
            createdAt: Date.now(),
          })
        }
      }
    })

    // 클러스터 기반 연결
    const clusterMap = new Map<string, string[]>()
    nodes.forEach(node => {
      if (node.clusterId) {
        if (!clusterMap.has(node.clusterId)) clusterMap.set(node.clusterId, [])
        clusterMap.get(node.clusterId)!.push(node.id)
      }
    })

    clusterMap.forEach((nodeIds) => {
      for (let i = 0; i < nodeIds.length - 1; i++) {
        edges.push({
          id: `edge-cluster-${edgeId++}`,
          source: nodeIds[i],
          target: nodeIds[i + 1],
          type: 'part_of',
          weight: 0.8,
          createdAt: Date.now(),
        })
      }
    })

    // 시간순 연결
    const sortedNodes = [...nodes].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    for (let i = 0; i < sortedNodes.length - 1; i++) {
      edges.push({
        id: `edge-time-${edgeId++}`,
        source: sortedNodes[i].id,
        target: sortedNodes[i + 1].id,
        type: 'follows',
        weight: 0.4,
        createdAt: Date.now(),
      })
    }
  }

  return { nodes, edges }
}

// BFS 경로 탐색
function findPathBFS(
  nodes: BrainNode[],
  edges: BrainEdge[],
  fromId: string,
  toId: string,
  maxHops: number
): { path: string[], steps: TraceStep[] } | null {
  const nodeMap = new Map<string, BrainNode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  // 인접 리스트 생성 (양방향)
  const adjacency = new Map<string, Set<string>>()
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set())
    adjacency.get(edge.source)!.add(edge.target)
    adjacency.get(edge.target)!.add(edge.source)
  })

  // BFS
  const queue: { nodeId: string, path: string[] }[] = [{ nodeId: fromId, path: [fromId] }]
  const visited = new Set<string>([fromId])

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!

    if (path.length > maxHops + 1) continue

    if (nodeId === toId) {
      // 경로 찾음 - TraceStep 생성
      const steps: TraceStep[] = path.map((id, idx) => {
        const node = nodeMap.get(id)
        const stepTypes: StepType[] = ['retrieve', 'read', 'reason', 'plan', 'decision']

        return {
          stepId: `step-${idx}`,
          index: idx,
          stepType: idx === 0 ? 'retrieve' : (idx === path.length - 1 ? 'decision' : stepTypes[idx % stepTypes.length]),
          input: idx === 0 ? `시작: ${node?.title || id}` : undefined,
          output: node?.title || `노드 ${id}`,
          usedNodeIds: [id],
          createdEdgeIds: idx > 0 ? [`path-edge-${idx}`] : [],
          confidence: node?.confidence || 0.8,
        }
      })

      return { path, steps }
    }

    const neighbors = adjacency.get(nodeId) || new Set()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push({ nodeId: neighbor, path: [...path, neighbor] })
      }
    }
  }

  return null
}

// 텍스트 기반 노드 검색
function findNodeByText(nodes: BrainNode[], query: string): BrainNode | null {
  const lowerQuery = query.toLowerCase()

  // 1. 정확한 ID 매치
  const exactId = nodes.find(n => n.id === query)
  if (exactId) return exactId

  // 2. 제목이 정확히 일치
  const exactTitle = nodes.find(n => n.title?.toLowerCase() === lowerQuery)
  if (exactTitle) return exactTitle

  // 3. 제목이 쿼리로 시작
  const startsWithTitle = nodes.find(n => n.title?.toLowerCase().startsWith(lowerQuery))
  if (startsWithTitle) return startsWithTitle

  // 4. 제목에 쿼리 포함
  const containsTitle = nodes.find(n => n.title?.toLowerCase().includes(lowerQuery))
  if (containsTitle) return containsTitle

  // 5. 요약에 쿼리 포함
  const containsSummary = nodes.find(n => n.summary?.toLowerCase().includes(lowerQuery))
  if (containsSummary) return containsSummary

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params
    const { searchParams } = new URL(request.url)

    const fromQuery = searchParams.get('from')
    const toQuery = searchParams.get('to')
    const maxHops = parseInt(searchParams.get('maxHops') || '10')
    const algorithm = searchParams.get('algorithm') || 'bfs'

    if (!fromQuery || !toQuery) {
      return NextResponse.json(
        { error: 'from과 to 파라미터가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 그래프 데이터 로드
    const { nodes, edges } = await loadGraphData(supabase, agentId)

    if (nodes.length === 0) {
      return NextResponse.json({
        found: false,
        message: '그래프 데이터가 없습니다.',
        trace: null,
      })
    }

    // 시작/종료 노드 찾기
    const fromNode = findNodeByText(nodes, fromQuery)
    const toNode = findNodeByText(nodes, toQuery)

    if (!fromNode) {
      return NextResponse.json({
        found: false,
        message: `시작 노드를 찾을 수 없습니다: "${fromQuery}"`,
        trace: null,
        suggestions: nodes.slice(0, 5).map(n => ({ id: n.id, title: n.title }))
      })
    }

    if (!toNode) {
      return NextResponse.json({
        found: false,
        message: `종료 노드를 찾을 수 없습니다: "${toQuery}"`,
        trace: null,
        suggestions: nodes.slice(0, 5).map(n => ({ id: n.id, title: n.title }))
      })
    }

    // BFS 경로 탐색
    const result = findPathBFS(nodes, edges, fromNode.id, toNode.id, maxHops)

    if (!result) {
      return NextResponse.json({
        found: false,
        message: `${maxHops}홉 이내에 경로를 찾을 수 없습니다.`,
        trace: null,
        fromNode: { id: fromNode.id, title: fromNode.title },
        toNode: { id: toNode.id, title: toNode.title },
      })
    }

    const trace: BrainTrace = {
      traceId: `trace-${Date.now()}`,
      startedAt: Date.now() - 100,
      endedAt: Date.now(),
      goal: `"${fromNode.title}"에서 "${toNode.title}"까지 경로 탐색`,
      finalAnswer: `${result.path.length - 1}단계를 거쳐 경로를 찾았습니다.`,
      steps: result.steps,
    }

    return NextResponse.json({
      found: true,
      trace,
      path: result.path,
      pathNodes: result.path.map(id => {
        const node = nodes.find(n => n.id === id)
        return { id, title: node?.title, type: node?.type }
      }),
      meta: {
        algorithm,
        maxHops,
        actualHops: result.path.length - 1,
        totalNodes: nodes.length,
        totalEdges: edges.length,
      },
    })
  } catch (error) {
    console.error('[Brain Pathfinder API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pathfinder 실패' },
      { status: 500 }
    )
  }
}
