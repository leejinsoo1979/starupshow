/**
 * Agent OS v2.0 - 통합 메모리 & 성장 시스템
 *
 * PRD v2.0 기반 전체 시스템 통합
 *
 * 컴포넌트:
 * 1. Memory Service - 5가지 메모리 타입 관리
 * 2. Compression Service - Layer 2 압축/요약
 * 3. Learning Service - Layer 3 인사이트 추출
 * 4. Relationship Service - 관계 관리
 * 5. Stats Service - 능력치 및 성장
 */

// Memory
export {
  saveAgentMemory,
  savePrivateMemory,
  saveMeetingMemory,
  saveTeamMemory,
  saveExecutionMemory,
  searchAgentMemories,
  getRecentPrivateMemories,
  getMeetingMemories,
  getImportantMemories,
  updateMemorySummary,
  linkMemories,
  type AgentMemory,
  type AgentMemoryType,
  type SaveAgentMemoryParams,
  type SearchAgentMemoriesParams,
} from './agent-memory-service'

// Compression
export {
  compressMemory,
  compressMemoriesBatch,
  summarizeConversationSession,
  generateDailySummary,
  type CompressionResult,
  type BatchCompressionResult,
} from './agent-compression-service'

// Learning
export {
  saveLearning,
  getLearnings,
  getPersonLearnings,
  extractLearningsFromMemories,
  saveExtractedLearnings,
  learnFromConversation,
  generatePersonInsight,
  buildLearningContext,
  type AgentLearning,
  type LearningCategory,
  type SaveLearningParams,
} from './agent-learning-service'

// Relationship
export {
  getOrCreateRelationship,
  updateRelationship,
  recordInteraction,
  getAgentRelationships,
  getRelationshipStats,
  generateGreeting,
  buildRelationshipContext,
  type AgentRelationship,
  type PartnerType,
  type CommunicationStyle,
  type RelationshipBoundaries,
  type RelationshipMilestone,
} from './agent-relationship-service'

// Stats
export {
  getOrCreateStats,
  increaseStat,
  increaseExpertise,
  addExperience,
  incrementCounter,
  updateTrustScore,
  onConversationComplete,
  onMeetingComplete,
  onTaskComplete,
  onWorkflowComplete,
  formatStatsForPrompt,
  analyzeGrowthTrend,
  type AgentStats,
  type StatName,
  type ExpertiseLevel,
  type GrowthLogEntry,
} from './agent-stats-service'

// ============================================
// Unified Agent Context Builder
// ============================================

import { getOrCreateRelationship, buildRelationshipContext } from './agent-relationship-service'
import { getOrCreateStats, formatStatsForPrompt } from './agent-stats-service'
import { buildLearningContext, getPersonLearnings } from './agent-learning-service'
import { searchAgentMemories } from './agent-memory-service'

export interface AgentContextParams {
  agentId: string
  userId?: string
  partnerAgentId?: string
  includeRelationship?: boolean
  includeStats?: boolean
  includeLearnings?: boolean
  includeRecentMemories?: boolean
  relevantTopics?: string[]
}

export interface AgentContext {
  relationship?: string
  stats?: string
  learnings?: string
  recentMemories?: string
  greeting?: string
}

/**
 * 에이전트 대화 컨텍스트 통합 생성
 */
export async function buildAgentContext(
  params: AgentContextParams
): Promise<AgentContext> {
  const context: AgentContext = {}

  try {
    // 관계 컨텍스트
    if (params.includeRelationship !== false && (params.userId || params.partnerAgentId)) {
      const partnerType = params.userId ? 'user' : 'agent'
      const partnerId = params.userId || params.partnerAgentId!

      const relationship = await getOrCreateRelationship(
        params.agentId,
        partnerType,
        partnerId
      )

      if (relationship) {
        context.relationship = buildRelationshipContext(relationship)

        // 인사말 생성
        const { generateGreeting } = await import('./agent-relationship-service')
        context.greeting = generateGreeting(relationship)
      }
    }

    // 능력치 컨텍스트
    if (params.includeStats !== false) {
      const stats = await getOrCreateStats(params.agentId)
      if (stats) {
        context.stats = formatStatsForPrompt(stats)
      }
    }

    // 학습 컨텍스트
    if (params.includeLearnings !== false) {
      context.learnings = await buildLearningContext(
        params.agentId,
        params.relevantTopics
      )
    }

    // 최근 메모리 (선택)
    if (params.includeRecentMemories) {
      const memories = await searchAgentMemories({
        agentId: params.agentId,
        limit: 5,
        minImportance: 7,
      })

      if (memories.length > 0) {
        context.recentMemories = `### 최근 중요 기억\n` +
          memories.map(m =>
            `- ${m.summary || m.raw_content.substring(0, 100)}...`
          ).join('\n')
      }
    }

    return context
  } catch (error) {
    console.error('[AgentOS] Context build failed:', error)
    return context
  }
}

/**
 * 전체 컨텍스트 문자열로 변환
 */
export function formatAgentContext(context: AgentContext): string {
  const sections: string[] = []

  if (context.stats) {
    sections.push(context.stats)
  }

  if (context.relationship) {
    sections.push(context.relationship)
  }

  if (context.learnings) {
    sections.push(context.learnings)
  }

  if (context.recentMemories) {
    sections.push(context.recentMemories)
  }

  return sections.join('\n\n---\n\n')
}

// ============================================
// Quick Start Helpers
// ============================================

import {
  savePrivateMemory as savePrivateMem,
  saveMeetingMemory as saveMeetingMem,
  type AgentMemory as AMem
} from './agent-memory-service'
import {
  recordInteraction,
  type AgentRelationship as ARel
} from './agent-relationship-service'
import { onConversationComplete, onMeetingComplete as onMeetingCompleteStats } from './agent-stats-service'
import { learnFromConversation } from './agent-learning-service'
import { evaluateTriggers } from '@/lib/proactive/trigger-evaluator'
import type { TriggerContext } from '@/lib/proactive/types'

/**
 * 1:1 대화 후 전체 처리
 */
export async function processConversation(params: {
  agentId: string
  userId: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  wasHelpful?: boolean
  topicDomain?: string
}): Promise<{
  memoryIds: string[]
  relationshipUpdated: boolean
  learnings: number
}> {
  const result = {
    memoryIds: [] as string[],
    relationshipUpdated: false,
    learnings: 0,
  }

  try {
    // 1. 관계 조회/생성 및 상호작용 기록
    const relationship = await getOrCreateRelationship(
      params.agentId,
      'user',
      params.userId
    )

    if (relationship) {
      await recordInteraction(relationship.id)
      result.relationshipUpdated = true
    }

    // 2. 메모리 저장
    for (const msg of params.messages) {
      const { success, id } = await savePrivateMem({
        agentId: params.agentId,
        relationshipId: relationship?.id || '',
        content: `[${msg.role}] ${msg.content}`,
        importance: msg.role === 'user' ? 6 : 5,  // 사용자 메시지 약간 더 중요
      })

      if (success && id) {
        result.memoryIds.push(id)
      }
    }

    // 3. 성장 처리
    await onConversationComplete(params.agentId, {
      wasHelpful: params.wasHelpful,
      topicDomain: params.topicDomain,
    })

    // 4. 학습 추출 (메모리 3개 이상일 때만)
    if (result.memoryIds.length >= 3) {
      const { saved } = await learnFromConversation(
        params.agentId,
        result.memoryIds
      )
      result.learnings = saved
    }

    // 5. 능동적 트리거 평가 (Proactive Engine Integration)
    try {
      const triggerContext: TriggerContext = {
        agentId: params.agentId,
        userId: params.userId,
        eventType: 'conversation_complete',
        eventData: {
          memoryCount: result.memoryIds.length,
          learningsExtracted: result.learnings,
          wasHelpful: params.wasHelpful,
          topicDomain: params.topicDomain,
        },
        timestamp: new Date().toISOString(),
      }
      await evaluateTriggers(triggerContext)
    } catch (triggerError) {
      // 트리거 평가 실패해도 메인 플로우는 계속
      console.warn('[AgentOS] Proactive trigger evaluation failed:', triggerError)
    }

    return result
  } catch (error) {
    console.error('[AgentOS] Process conversation failed:', error)
    return result
  }
}

/**
 * 회의 참여 후 전체 처리
 */
export async function processMeetingParticipation(params: {
  agentId: string
  meetingId: string
  roomId: string
  summary: string
  wasLeading?: boolean
  topicDomain?: string
}): Promise<{ memoryId?: string; statsUpdated: boolean }> {
  const result = { memoryId: undefined as string | undefined, statsUpdated: false }

  try {
    // 1. 회의 메모리 저장
    const { success, id } = await saveMeetingMem({
      agentId: params.agentId,
      meetingId: params.meetingId,
      roomId: params.roomId,
      content: params.summary,
      importance: 8,  // 회의는 중요
    })

    if (success && id) {
      result.memoryId = id
    }

    // 2. 성장 처리
    await onMeetingCompleteStats(params.agentId, {
      wasLeading: params.wasLeading,
      topicDomain: params.topicDomain,
    })
    result.statsUpdated = true

    // 3. 능동적 트리거 평가 (Proactive Engine Integration)
    try {
      const triggerContext: TriggerContext = {
        agentId: params.agentId,
        eventType: 'meeting_complete',
        eventData: {
          meetingId: params.meetingId,
          roomId: params.roomId,
          wasLeading: params.wasLeading,
          topicDomain: params.topicDomain,
        },
        timestamp: new Date().toISOString(),
      }
      await evaluateTriggers(triggerContext)
    } catch (triggerError) {
      console.warn('[AgentOS] Proactive trigger evaluation failed:', triggerError)
    }

    return result
  } catch (error) {
    console.error('[AgentOS] Process meeting failed:', error)
    return result
  }
}
