/**
 * Agent Relationship Service
 *
 * 에이전트-사용자/에이전트 관계 관리
 * - 친밀도, 신뢰도, 친숙도
 * - 소통 스타일 자동 조절
 * - 마일스톤 기록
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ============================================
// Types
// ============================================

export type PartnerType = 'user' | 'agent'
export type CommunicationStyle = 'formal' | 'polite' | 'casual' | 'friendly'

export interface AgentRelationship {
  id: string
  agent_id: string
  partner_type: PartnerType
  partner_user_id?: string | null
  partner_agent_id?: string | null
  rapport: number          // 친밀도 0-100
  trust: number            // 신뢰도 0-100
  familiarity: number      // 친숙도 0-100
  communication_style: CommunicationStyle
  boundaries: RelationshipBoundaries
  interaction_count: number
  last_interaction_at?: string | null
  first_interaction_at: string
  milestones: RelationshipMilestone[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface RelationshipBoundaries {
  preferred_topics?: string[]
  avoided_topics?: string[]
  preferred_time?: string
  response_style?: 'brief' | 'detailed' | 'balanced'
}

export interface RelationshipMilestone {
  type: string
  date: string
  note?: string
  data?: Record<string, any>
}

export interface UpdateRelationshipParams {
  rapportChange?: number
  trustChange?: number
  familiarityChange?: number
  milestone?: RelationshipMilestone
  boundaries?: Partial<RelationshipBoundaries>
}

// ============================================
// Core Functions
// ============================================

/**
 * 관계 조회 또는 생성
 */
export async function getOrCreateRelationship(
  agentId: string,
  partnerType: PartnerType,
  partnerId: string
): Promise<AgentRelationship | null> {
  try {
    const supabase = createAdminClient()

    // 기존 관계 조회
    let query = supabase
      .from('agent_relationships')
      .select('*')
      .eq('agent_id', agentId)
      .eq('partner_type', partnerType)

    if (partnerType === 'user') {
      query = query.eq('partner_user_id', partnerId)
    } else {
      query = query.eq('partner_agent_id', partnerId)
    }

    const { data: existing } = await query.single()

    if (existing) {
      return existing as AgentRelationship
    }

    // 새 관계 생성
    const newRelationship = {
      agent_id: agentId,
      partner_type: partnerType,
      partner_user_id: partnerType === 'user' ? partnerId : null,
      partner_agent_id: partnerType === 'agent' ? partnerId : null,
      rapport: 10,
      trust: 10,
      familiarity: 0,
      communication_style: 'formal' as CommunicationStyle,
      boundaries: {},
      interaction_count: 0,
      milestones: [{
        type: 'first_meeting',
        date: new Date().toISOString(),
        note: '첫 만남',
      }],
      metadata: {},
    }

    const { data, error } = await (supabase as any)
      .from('agent_relationships')
      .insert(newRelationship)
      .select()
      .single()

    if (error) {
      console.error('[Relationship] Create failed:', error)
      return null
    }

    return data as AgentRelationship
  } catch (error) {
    console.error('[Relationship] Error:', error)
    return null
  }
}

/**
 * 관계 업데이트
 */
export async function updateRelationship(
  relationshipId: string,
  params: UpdateRelationshipParams
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // 현재 관계 조회
    const { data: current } = await (supabase as any)
      .from('agent_relationships')
      .select('*')
      .eq('id', relationshipId)
      .single()

    if (!current) {
      return false
    }

    // 업데이트 데이터 구성
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // 수치 업데이트
    if (params.rapportChange) {
      updates.rapport = Math.max(0, Math.min(100, current.rapport + params.rapportChange))
    }
    if (params.trustChange) {
      updates.trust = Math.max(0, Math.min(100, current.trust + params.trustChange))
    }
    if (params.familiarityChange) {
      updates.familiarity = Math.max(0, Math.min(100, current.familiarity + params.familiarityChange))
    }

    // 마일스톤 추가
    if (params.milestone) {
      updates.milestones = [...(current.milestones || []), params.milestone]
    }

    // 경계 업데이트
    if (params.boundaries) {
      updates.boundaries = { ...(current.boundaries || {}), ...params.boundaries }
    }

    // 소통 스타일 자동 조절
    const newRapport = updates.rapport ?? current.rapport
    updates.communication_style = determineCommunicationStyle(newRapport)

    const { error } = await (supabase as any)
      .from('agent_relationships')
      .update(updates)
      .eq('id', relationshipId)

    return !error
  } catch (error) {
    console.error('[Relationship] Update failed:', error)
    return false
  }
}

/**
 * 친밀도 기반 소통 스타일 결정
 */
function determineCommunicationStyle(rapport: number): CommunicationStyle {
  if (rapport >= 80) return 'friendly'
  if (rapport >= 60) return 'casual'
  if (rapport >= 40) return 'polite'
  return 'formal'
}

/**
 * 상호작용 기록
 */
export async function recordInteraction(
  relationshipId: string,
  interactionType?: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // 현재 관계 조회
    const { data: current } = await (supabase as any)
      .from('agent_relationships')
      .select('interaction_count, familiarity, milestones')
      .eq('id', relationshipId)
      .single()

    if (!current) {
      return false
    }

    const newCount = (current.interaction_count || 0) + 1
    const updates: Record<string, any> = {
      interaction_count: newCount,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 친숙도 증가 (대화할수록 친숙해짐)
    if (current.familiarity < 100) {
      updates.familiarity = Math.min(100, current.familiarity + 1)
    }

    // 마일스톤 체크
    const milestones = current.milestones || []
    const milestoneCounts = [10, 50, 100, 500, 1000]

    for (const count of milestoneCounts) {
      if (newCount === count) {
        const existingMilestone = milestones.find(
          (m: RelationshipMilestone) => m.type === `${count}_conversations`
        )
        if (!existingMilestone) {
          milestones.push({
            type: `${count}_conversations`,
            date: new Date().toISOString(),
            note: `${count}회 대화 달성`,
          })
          updates.milestones = milestones

          // 마일스톤 달성 시 친밀도 보너스
          updates.rapport = Math.min(100, (current.rapport || 10) + 5)
        }
        break
      }
    }

    const { error } = await (supabase as any)
      .from('agent_relationships')
      .update(updates)
      .eq('id', relationshipId)

    return !error
  } catch (error) {
    console.error('[Relationship] Record interaction failed:', error)
    return false
  }
}

/**
 * 에이전트의 모든 관계 조회
 */
export async function getAgentRelationships(
  agentId: string,
  options?: {
    partnerType?: PartnerType
    minRapport?: number
    limit?: number
  }
): Promise<AgentRelationship[]> {
  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('agent_relationships')
      .select('*')
      .eq('agent_id', agentId)
      .order('last_interaction_at', { ascending: false, nullsFirst: false })

    if (options?.partnerType) {
      query = query.eq('partner_type', options.partnerType)
    }

    if (options?.minRapport) {
      query = query.gte('rapport', options.minRapport)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Relationship] Get failed:', error)
      return []
    }

    return (data || []) as AgentRelationship[]
  } catch (error) {
    console.error('[Relationship] Error:', error)
    return []
  }
}

/**
 * 관계 통계 조회
 */
export async function getRelationshipStats(
  agentId: string
): Promise<{
  totalRelationships: number
  userRelationships: number
  agentRelationships: number
  avgRapport: number
  avgTrust: number
  topRelationships: AgentRelationship[]
}> {
  try {
    const supabase = createAdminClient()

    const { data: relationships } = await (supabase as any)
      .from('agent_relationships')
      .select('*')
      .eq('agent_id', agentId)

    if (!relationships || relationships.length === 0) {
      return {
        totalRelationships: 0,
        userRelationships: 0,
        agentRelationships: 0,
        avgRapport: 0,
        avgTrust: 0,
        topRelationships: [],
      }
    }

    const userRels = relationships.filter((r: any) => r.partner_type === 'user')
    const agentRels = relationships.filter((r: any) => r.partner_type === 'agent')

    const avgRapport = relationships.reduce((sum: number, r: any) => sum + r.rapport, 0) / relationships.length
    const avgTrust = relationships.reduce((sum: number, r: any) => sum + r.trust, 0) / relationships.length

    // 친밀도 상위 5개 관계
    const topRelationships = [...relationships]
      .sort((a, b) => b.rapport - a.rapport)
      .slice(0, 5) as AgentRelationship[]

    return {
      totalRelationships: relationships.length,
      userRelationships: userRels.length,
      agentRelationships: agentRels.length,
      avgRapport: Math.round(avgRapport),
      avgTrust: Math.round(avgTrust),
      topRelationships,
    }
  } catch (error) {
    console.error('[Relationship] Stats failed:', error)
    return {
      totalRelationships: 0,
      userRelationships: 0,
      agentRelationships: 0,
      avgRapport: 0,
      avgTrust: 0,
      topRelationships: [],
    }
  }
}

/**
 * 관계 기반 인사말 생성
 */
export function generateGreeting(relationship: AgentRelationship): string {
  const { rapport, interaction_count, communication_style } = relationship

  if (interaction_count === 0) {
    return '안녕하세요, 처음 뵙겠습니다.'
  }

  switch (communication_style) {
    case 'friendly':
      if (rapport >= 90) return '오! 반가워!'
      return '안녕! 또 봐서 좋아!'

    case 'casual':
      return '안녕하세요! 다시 만나서 반가워요.'

    case 'polite':
      return '안녕하세요. 다시 뵙게 되어 반갑습니다.'

    case 'formal':
    default:
      return '안녕하세요. 무엇을 도와드릴까요?'
  }
}

/**
 * 관계 기반 프롬프트 컨텍스트 생성
 */
export function buildRelationshipContext(relationship: AgentRelationship): string {
  const {
    rapport,
    trust,
    familiarity,
    communication_style,
    interaction_count,
    boundaries,
    milestones,
  } = relationship

  let context = `### 관계 정보\n`
  context += `- 친밀도: ${rapport}/100\n`
  context += `- 신뢰도: ${trust}/100\n`
  context += `- 친숙도: ${familiarity}/100\n`
  context += `- 대화 횟수: ${interaction_count}회\n`
  context += `- 소통 스타일: ${communication_style}\n`

  // 소통 스타일 가이드
  context += `\n### 소통 가이드\n`
  switch (communication_style) {
    case 'friendly':
      context += `- 친한 친구처럼 편하게 대화\n`
      context += `- 반말 사용 가능\n`
      context += `- 이모지 사용 가능\n`
      break
    case 'casual':
      context += `- 친근하지만 예의있게\n`
      context += `- 존댓말 사용하되 딱딱하지 않게\n`
      break
    case 'polite':
      context += `- 공손하고 예의바른 말투\n`
      context += `- 존댓말 사용\n`
      break
    case 'formal':
    default:
      context += `- 격식을 갖춘 말투\n`
      context += `- 존댓말 필수\n`
      context += `- 비즈니스 톤 유지\n`
  }

  // 경계 정보
  if (boundaries?.preferred_topics?.length) {
    context += `\n선호 주제: ${boundaries.preferred_topics.join(', ')}\n`
  }
  if (boundaries?.avoided_topics?.length) {
    context += `피해야 할 주제: ${boundaries.avoided_topics.join(', ')}\n`
  }

  // 최근 마일스톤
  if (milestones?.length) {
    const recentMilestones = milestones.slice(-3)
    context += `\n### 최근 마일스톤\n`
    for (const m of recentMilestones) {
      context += `- ${m.note || m.type} (${m.date.split('T')[0]})\n`
    }
  }

  return context.trim()
}

// ============================================
// Export
// ============================================

export default {
  getOrCreateRelationship,
  updateRelationship,
  recordInteraction,
  getAgentRelationships,
  getRelationshipStats,
  generateGreeting,
  buildRelationshipContext,
}
