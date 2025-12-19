export const dynamic = 'force-dynamic'
/**
 * Agent OS v2.0 API
 *
 * 에이전트의 관계, 능력치, 학습 데이터 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import {
  getOrCreateRelationship,
  getRelationshipStats,
  type AgentRelationship,
} from '@/lib/memory/agent-relationship-service'
import {
  getOrCreateStats,
  type AgentStats,
} from '@/lib/memory/agent-stats-service'
import {
  getLearnings,
  type AgentLearning,
} from '@/lib/memory/agent-learning-service'

export interface AgentOSData {
  relationship: AgentRelationship | null
  stats: AgentStats | null
  learnings: AgentLearning[]
  relationshipStats: {
    totalRelationships: number
    userRelationships: number
    agentRelationships: number
    avgRapport: number
    avgTrust: number
  } | null
}

/**
 * GET: 에이전트 OS 데이터 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params
    const supabase = await createClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const result: AgentOSData = {
      relationship: null,
      stats: null,
      learnings: [],
      relationshipStats: null,
    }

    // 1. 관계 로드 (없으면 생성)
    try {
      result.relationship = await getOrCreateRelationship(agentId, 'user', user.id)
    } catch (err) {
      console.error('[AgentOS API] Relationship error:', err)
    }

    // 2. 능력치 로드 (없으면 생성)
    try {
      result.stats = await getOrCreateStats(agentId)
    } catch (err) {
      console.error('[AgentOS API] Stats error:', err)
    }

    // 3. 학습 인사이트 로드
    try {
      result.learnings = await getLearnings({
        agentId,
        minConfidence: 50,
        limit: 20,
      })
    } catch (err) {
      console.error('[AgentOS API] Learnings error:', err)
    }

    // 4. 관계 통계
    try {
      result.relationshipStats = await getRelationshipStats(agentId)
    } catch (err) {
      console.error('[AgentOS API] Relationship stats error:', err)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[AgentOS API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 실패' },
      { status: 500 }
    )
  }
}
