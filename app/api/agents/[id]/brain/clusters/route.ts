export const dynamic = 'force-dynamic'

/**
 * Brain Map - Clusters API
 * GET /api/agents/:agentId/brain/clusters
 *
 * 실제 DB 데이터 기반 클러스터링:
 * - knowledge_type 별 클러스터
 * - log_type 별 클러스터
 * - 태그 기반 클러스터
 * - 프로젝트 기반 클러스터
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import type { BrainCluster } from '@/types/brain-map'

// 클러스터 색상
const CLUSTER_COLORS = [
  '#FF6B9D', '#00D9FF', '#7C3AED', '#10B981', '#F59E0B', '#6366F1',
  '#EC4899', '#14B8A6', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
]

// 클러스터 라벨 매핑
const CLUSTER_LABELS: Record<string, string> = {
  // Knowledge types
  'knowledge-project': '프로젝트 지식',
  'knowledge-team': '팀 지식',
  'knowledge-domain': '도메인 지식',
  'knowledge-preference': '선호도',
  'knowledge-procedure': '절차/프로세스',
  'knowledge-decision_rule': '의사결정 규칙',
  'knowledge-lesson_learned': '학습된 교훈',
  // Log types
  'log-conversation': '대화',
  'log-task_work': '작업',
  'log-decision': '결정',
  'log-analysis': '분석',
  'log-learning': '학습',
  'log-collaboration': '협업',
  // Commit types
  'commit-hourly': '시간별 커밋',
  'commit-daily': '일간 커밋',
  'commit-weekly': '주간 커밋',
  'commit-monthly': '월간 커밋',
  'commit-milestone': '마일스톤',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params
    const { searchParams } = new URL(request.url)

    const minCoherence = parseFloat(searchParams.get('minCoherence') || '0')
    const limit = parseInt(searchParams.get('limit') || '12')

    const supabase = await createClient()
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const clusters: BrainCluster[] = []
    const clusterNodeMap = new Map<string, string[]>()
    const clusterTagMap = new Map<string, Map<string, number>>()

    // 1. agent_knowledge에서 knowledge_type 별 클러스터링
    const { data: knowledge } = await supabase
      .from('agent_knowledge')
      .select('id, knowledge_type, tags, subject')
      .eq('agent_id', agentId)

    if (knowledge) {
      knowledge.forEach((k: any) => {
        const clusterId = `knowledge-${k.knowledge_type}`
        if (!clusterNodeMap.has(clusterId)) {
          clusterNodeMap.set(clusterId, [])
          clusterTagMap.set(clusterId, new Map())
        }
        clusterNodeMap.get(clusterId)!.push(k.id)

        // 태그 카운트
        const tags = k.tags || []
        tags.forEach((tag: string) => {
          const tagCount = clusterTagMap.get(clusterId)!
          tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
        })

        // 제목에서 키워드 추출
        if (k.subject) {
          const words = k.subject.split(/\s+/).filter((w: string) => w.length > 1)
          words.forEach((word: string) => {
            const tagCount = clusterTagMap.get(clusterId)!
            tagCount.set(word, (tagCount.get(word) || 0) + 0.5)
          })
        }
      })
    }

    // 2. agent_work_logs에서 log_type 별 클러스터링
    const { data: workLogs } = await supabase
      .from('agent_work_logs')
      .select('id, log_type, tags, title')
      .eq('agent_id', agentId)

    if (workLogs) {
      workLogs.forEach((log: any) => {
        const clusterId = `log-${log.log_type}`
        if (!clusterNodeMap.has(clusterId)) {
          clusterNodeMap.set(clusterId, [])
          clusterTagMap.set(clusterId, new Map())
        }
        clusterNodeMap.get(clusterId)!.push(log.id)

        // 태그 카운트
        const tags = log.tags || []
        tags.forEach((tag: string) => {
          const tagCount = clusterTagMap.get(clusterId)!
          tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
        })

        // 제목에서 키워드 추출
        if (log.title) {
          const words = log.title.split(/\s+/).filter((w: string) => w.length > 1)
          words.forEach((word: string) => {
            const tagCount = clusterTagMap.get(clusterId)!
            tagCount.set(word, (tagCount.get(word) || 0) + 0.5)
          })
        }
      })
    }

    // 3. agent_commits에서 commit_type 별 클러스터링
    const { data: commits } = await supabase
      .from('agent_commits')
      .select('id, commit_type, stats, title')
      .eq('agent_id', agentId)

    if (commits) {
      commits.forEach((c: any) => {
        const clusterId = `commit-${c.commit_type}`
        if (!clusterNodeMap.has(clusterId)) {
          clusterNodeMap.set(clusterId, [])
          clusterTagMap.set(clusterId, new Map())
        }
        clusterNodeMap.get(clusterId)!.push(c.id)

        // stats에서 key_topics 추출
        const topics = c.stats?.key_topics || []
        topics.forEach((topic: string) => {
          const tagCount = clusterTagMap.get(clusterId)!
          tagCount.set(topic, (tagCount.get(topic) || 0) + 1)
        })
      })
    }

    // 클러스터 객체 생성
    let colorIndex = 0
    clusterNodeMap.forEach((nodeIds, clusterId) => {
      if (nodeIds.length === 0) return

      // 상위 키워드 추출
      const tagCounts = clusterTagMap.get(clusterId)!
      const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag)

      // 응집도 계산 (노드 수와 태그 다양성 기반)
      const uniqueTags = tagCounts.size
      const cohesionScore = Math.min(1, 0.5 + (nodeIds.length / 50) + (uniqueTags > 0 ? 0.3 : 0))

      clusters.push({
        clusterId,
        label: CLUSTER_LABELS[clusterId] || clusterId,
        topKeywords: sortedTags,
        nodeCount: nodeIds.length,
        cohesionScore,
        centralNodeIds: nodeIds.slice(0, 5), // 처음 5개를 중심 노드로
        color: CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length],
      })

      colorIndex++
    })

    // 노드 수 기준 정렬
    clusters.sort((a, b) => b.nodeCount - a.nodeCount)

    // 필터 적용
    let filteredClusters = clusters
    if (minCoherence > 0) {
      filteredClusters = clusters.filter(c => c.cohesionScore >= minCoherence)
    }

    // 리밋 적용
    filteredClusters = filteredClusters.slice(0, limit)

    return NextResponse.json({
      clusters: filteredClusters,
      meta: {
        totalClusters: filteredClusters.length,
        avgCohesion: filteredClusters.length > 0
          ? filteredClusters.reduce((sum, c) => sum + c.cohesionScore, 0) / filteredClusters.length
          : 0,
        totalNodes: Array.from(clusterNodeMap.values()).reduce((sum, arr) => sum + arr.length, 0),
      },
    })
  } catch (error) {
    console.error('[Brain Clusters API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Clusters 조회 실패' },
      { status: 500 }
    )
  }
}
