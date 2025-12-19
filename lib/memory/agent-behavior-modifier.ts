/**
 * Agent Behavior Modifier v2.0
 *
 * PRD v2.0 Phase 4.4: 능력치 기반 행동 조절기
 * - 능력치에 따른 응답 스타일 조절
 * - 전문성에 따른 답변 깊이 조절
 * - 신뢰도에 따른 자율성 조절
 * - 프롬프트 동적 생성
 */

import { AgentStats, getOrCreateStats, formatStatsForPrompt } from './agent-stats-service'
import { AgentRelationship } from './agent-relationship-service'
import { AgentLearning, getAgentLearnings, formatLearningsForPrompt } from './agent-experience-collector'

// ============================================
// Types
// ============================================

export interface BehaviorProfile {
  // 능력치 기반 행동 특성
  analyticalDepth: 'shallow' | 'moderate' | 'deep'       // 분석력 기반
  communicationStyle: 'concise' | 'balanced' | 'elaborate' // 소통력 기반
  creativityLevel: 'conservative' | 'balanced' | 'innovative' // 창의성 기반
  leadershipMode: 'supportive' | 'collaborative' | 'directive' // 리더십 기반

  // 전문성 기반
  expertDomains: string[]
  confidenceAreas: string[]

  // 신뢰도 기반 자율성
  autonomyLevel: 'low' | 'medium' | 'high'
  canMakeDecisions: boolean
  requiresConfirmation: boolean

  // 레벨 기반
  experienceLevel: 'novice' | 'intermediate' | 'expert' | 'master'
}

export interface BehaviorContext {
  stats: AgentStats
  relationship?: AgentRelationship | null
  learnings?: AgentLearning[]
  currentTopic?: string
  taskType?: 'conversation' | 'meeting' | 'task' | 'workflow'
}

export interface BehaviorModification {
  promptAdditions: string[]
  constraints: string[]
  encouragements: string[]
  warnings: string[]
  responseGuidelines: string
}

// ============================================
// Behavior Profile Generation
// ============================================

/**
 * 능력치로부터 행동 프로필 생성
 */
export function generateBehaviorProfile(stats: AgentStats): BehaviorProfile {
  const profile: BehaviorProfile = {
    analyticalDepth: getAnalyticalDepth(stats.analysis),
    communicationStyle: getCommunicationStyle(stats.communication),
    creativityLevel: getCreativityLevel(stats.creativity),
    leadershipMode: getLeadershipMode(stats.leadership),
    expertDomains: getExpertDomains(stats.expertise),
    confidenceAreas: getConfidenceAreas(stats.expertise),
    autonomyLevel: getAutonomyLevel(stats.trust_score),
    canMakeDecisions: stats.trust_score >= 70,
    requiresConfirmation: stats.trust_score < 50,
    experienceLevel: getExperienceLevel(stats.level),
  }

  return profile
}

function getAnalyticalDepth(analysis: number): BehaviorProfile['analyticalDepth'] {
  if (analysis >= 70) return 'deep'
  if (analysis >= 40) return 'moderate'
  return 'shallow'
}

function getCommunicationStyle(communication: number): BehaviorProfile['communicationStyle'] {
  if (communication >= 70) return 'elaborate'
  if (communication >= 40) return 'balanced'
  return 'concise'
}

function getCreativityLevel(creativity: number): BehaviorProfile['creativityLevel'] {
  if (creativity >= 70) return 'innovative'
  if (creativity >= 40) return 'balanced'
  return 'conservative'
}

function getLeadershipMode(leadership: number): BehaviorProfile['leadershipMode'] {
  if (leadership >= 70) return 'directive'
  if (leadership >= 40) return 'collaborative'
  return 'supportive'
}

function getExpertDomains(expertise: Record<string, { level: number; experience_count: number }>): string[] {
  return Object.entries(expertise || {})
    .filter(([, exp]) => exp.level >= 60)
    .sort((a, b) => b[1].level - a[1].level)
    .slice(0, 3)
    .map(([domain]) => domain)
}

function getConfidenceAreas(expertise: Record<string, { level: number; experience_count: number }>): string[] {
  return Object.entries(expertise || {})
    .filter(([, exp]) => exp.level >= 80)
    .map(([domain]) => domain)
}

function getAutonomyLevel(trustScore: number): BehaviorProfile['autonomyLevel'] {
  if (trustScore >= 70) return 'high'
  if (trustScore >= 40) return 'medium'
  return 'low'
}

function getExperienceLevel(level: number): BehaviorProfile['experienceLevel'] {
  if (level >= 8) return 'master'
  if (level >= 5) return 'expert'
  if (level >= 3) return 'intermediate'
  return 'novice'
}

// ============================================
// Behavior Modification
// ============================================

/**
 * 컨텍스트에 따른 행동 수정사항 생성
 */
export function generateBehaviorModification(
  context: BehaviorContext
): BehaviorModification {
  const profile = generateBehaviorProfile(context.stats)
  const modification: BehaviorModification = {
    promptAdditions: [],
    constraints: [],
    encouragements: [],
    warnings: [],
    responseGuidelines: '',
  }

  // 1. 분석력 기반 수정
  applyAnalyticalModifications(profile, modification)

  // 2. 소통력 기반 수정
  applyCommunicationModifications(profile, modification)

  // 3. 창의성 기반 수정
  applyCreativityModifications(profile, modification)

  // 4. 리더십 기반 수정
  applyLeadershipModifications(profile, context, modification)

  // 5. 전문성 기반 수정
  applyExpertiseModifications(profile, context, modification)

  // 6. 자율성/신뢰도 기반 수정
  applyAutonomyModifications(profile, modification)

  // 7. 경험 레벨 기반 수정
  applyExperienceLevelModifications(profile, modification)

  // 8. 응답 가이드라인 생성
  modification.responseGuidelines = buildResponseGuidelines(profile, context)

  return modification
}

function applyAnalyticalModifications(
  profile: BehaviorProfile,
  mod: BehaviorModification
): void {
  switch (profile.analyticalDepth) {
    case 'deep':
      mod.promptAdditions.push('깊이 있는 분석과 다각도 검토를 제공합니다.')
      mod.encouragements.push('데이터와 근거를 기반으로 심층 분석을 제시하세요.')
      break
    case 'moderate':
      mod.promptAdditions.push('균형 잡힌 분석을 제공합니다.')
      break
    case 'shallow':
      mod.constraints.push('복잡한 분석보다는 핵심 요점 중심으로 답변합니다.')
      mod.warnings.push('분석력이 아직 발전 중이므로 심층 분석은 주의가 필요합니다.')
      break
  }
}

function applyCommunicationModifications(
  profile: BehaviorProfile,
  mod: BehaviorModification
): void {
  switch (profile.communicationStyle) {
    case 'elaborate':
      mod.promptAdditions.push('상세하고 풍부한 설명을 제공합니다.')
      mod.encouragements.push('맥락과 배경을 포함한 완전한 답변을 제공하세요.')
      break
    case 'balanced':
      mod.promptAdditions.push('적절한 길이의 답변을 제공합니다.')
      break
    case 'concise':
      mod.constraints.push('간결하고 핵심적인 답변을 합니다.')
      break
  }
}

function applyCreativityModifications(
  profile: BehaviorProfile,
  mod: BehaviorModification
): void {
  switch (profile.creativityLevel) {
    case 'innovative':
      mod.promptAdditions.push('창의적인 대안과 새로운 아이디어를 제시합니다.')
      mod.encouragements.push('기존 방식을 넘어서는 혁신적인 접근을 제안하세요.')
      break
    case 'balanced':
      mod.promptAdditions.push('검증된 방법과 새로운 시도를 균형있게 제안합니다.')
      break
    case 'conservative':
      mod.constraints.push('검증된 방법과 안전한 접근을 우선합니다.')
      mod.warnings.push('새로운 시도보다는 검증된 방법을 권장합니다.')
      break
  }
}

function applyLeadershipModifications(
  profile: BehaviorProfile,
  context: BehaviorContext,
  mod: BehaviorModification
): void {
  // 회의 상황에서만 리더십 모드 적용
  if (context.taskType !== 'meeting') return

  switch (profile.leadershipMode) {
    case 'directive':
      mod.promptAdditions.push('회의를 주도적으로 진행하고 방향을 제시합니다.')
      mod.encouragements.push('논의를 이끌고 결론을 도출하세요.')
      break
    case 'collaborative':
      mod.promptAdditions.push('참여자들의 의견을 조율하며 협력적으로 진행합니다.')
      break
    case 'supportive':
      mod.constraints.push('다른 참여자를 지원하는 역할에 집중합니다.')
      break
  }
}

function applyExpertiseModifications(
  profile: BehaviorProfile,
  context: BehaviorContext,
  mod: BehaviorModification
): void {
  if (profile.expertDomains.length > 0) {
    mod.promptAdditions.push(
      `전문 분야: ${profile.expertDomains.join(', ')}`
    )
  }

  // 현재 주제가 전문 분야인 경우
  if (context.currentTopic && profile.confidenceAreas.includes(context.currentTopic)) {
    mod.encouragements.push(`${context.currentTopic}는 확신을 가지고 답변할 수 있는 전문 분야입니다.`)
  }

  // 현재 주제가 비전문 분야인 경우
  if (context.currentTopic && !profile.expertDomains.includes(context.currentTopic)) {
    mod.warnings.push(`${context.currentTopic}는 아직 경험이 부족한 분야이므로 신중하게 답변하세요.`)
  }
}

function applyAutonomyModifications(
  profile: BehaviorProfile,
  mod: BehaviorModification
): void {
  switch (profile.autonomyLevel) {
    case 'high':
      mod.promptAdditions.push('높은 신뢰도를 바탕으로 자율적으로 판단하고 행동합니다.')
      if (profile.canMakeDecisions) {
        mod.encouragements.push('필요시 스스로 결정을 내릴 수 있습니다.')
      }
      break
    case 'medium':
      mod.constraints.push('중요한 결정은 사용자 확인 후 진행합니다.')
      break
    case 'low':
      mod.constraints.push('모든 행동에 대해 사용자 확인을 받습니다.')
      if (profile.requiresConfirmation) {
        mod.warnings.push('아직 신뢰를 쌓는 단계입니다. 확인 없이 행동하지 마세요.')
      }
      break
  }
}

function applyExperienceLevelModifications(
  profile: BehaviorProfile,
  mod: BehaviorModification
): void {
  switch (profile.experienceLevel) {
    case 'master':
      mod.promptAdditions.push('오랜 경험을 바탕으로 숙련된 조언을 제공합니다.')
      break
    case 'expert':
      mod.promptAdditions.push('풍부한 경험을 바탕으로 전문적인 답변을 제공합니다.')
      break
    case 'intermediate':
      mod.promptAdditions.push('성장하고 있으며 계속 배우고 있습니다.')
      break
    case 'novice':
      mod.constraints.push('아직 배우는 단계이므로 겸손하게 답변합니다.')
      mod.warnings.push('확실하지 않은 내용은 솔직히 모른다고 말하세요.')
      break
  }
}

function buildResponseGuidelines(
  profile: BehaviorProfile,
  context: BehaviorContext
): string {
  const guidelines: string[] = []

  // 분석 깊이
  if (profile.analyticalDepth === 'deep') {
    guidelines.push('- 데이터와 근거를 제시하며 깊이 있는 분석 제공')
  } else if (profile.analyticalDepth === 'shallow') {
    guidelines.push('- 핵심 포인트 중심의 간결한 답변')
  }

  // 소통 스타일
  if (profile.communicationStyle === 'elaborate') {
    guidelines.push('- 배경 설명과 맥락을 포함한 상세한 답변')
  } else if (profile.communicationStyle === 'concise') {
    guidelines.push('- 불필요한 설명 없이 핵심만 전달')
  }

  // 창의성
  if (profile.creativityLevel === 'innovative') {
    guidelines.push('- 새로운 관점과 혁신적인 대안 제시')
  } else if (profile.creativityLevel === 'conservative') {
    guidelines.push('- 검증된 방법과 안전한 접근 우선')
  }

  // 리더십 (회의 시)
  if (context.taskType === 'meeting') {
    if (profile.leadershipMode === 'directive') {
      guidelines.push('- 회의 주도 및 결론 도출')
    } else if (profile.leadershipMode === 'supportive') {
      guidelines.push('- 다른 참여자 지원 및 보조')
    }
  }

  // 자율성
  if (profile.autonomyLevel === 'high') {
    guidelines.push('- 자율적 판단 가능')
  } else if (profile.autonomyLevel === 'low') {
    guidelines.push('- 중요 결정 전 반드시 확인 요청')
  }

  return guidelines.length > 0
    ? '### 응답 가이드라인\n' + guidelines.join('\n')
    : ''
}

// ============================================
// System Prompt Generation
// ============================================

/**
 * 능력치와 학습 기반의 시스템 프롬프트 생성
 */
export async function buildBehaviorSystemPrompt(
  agentId: string,
  context?: Partial<BehaviorContext>
): Promise<string> {
  // 능력치 조회
  const stats = await getOrCreateStats(agentId)
  if (!stats) {
    return ''
  }

  // 학습 인사이트 조회 (주제 관련)
  let learnings: AgentLearning[] = []
  if (context?.currentTopic) {
    learnings = await getAgentLearnings(agentId, {
      minConfidence: 60,
      limit: 5,
    })
  }

  const fullContext: BehaviorContext = {
    stats,
    learnings,
    ...context,
  }

  // 행동 수정사항 생성
  const modification = generateBehaviorModification(fullContext)
  const profile = generateBehaviorProfile(stats)

  // 시스템 프롬프트 조립
  let systemPrompt = ''

  // 1. 능력치 요약
  systemPrompt += formatStatsForPrompt(stats) + '\n\n'

  // 2. 행동 프로필
  systemPrompt += '### 행동 프로필\n'
  systemPrompt += `- 분석 깊이: ${profile.analyticalDepth}\n`
  systemPrompt += `- 소통 스타일: ${profile.communicationStyle}\n`
  systemPrompt += `- 창의성: ${profile.creativityLevel}\n`
  systemPrompt += `- 리더십: ${profile.leadershipMode}\n`
  systemPrompt += `- 자율성: ${profile.autonomyLevel}\n`
  systemPrompt += `- 경험 수준: ${profile.experienceLevel}\n\n`

  // 3. 전문 분야
  if (profile.expertDomains.length > 0) {
    systemPrompt += `### 전문 분야\n`
    systemPrompt += profile.expertDomains.map(d => `- ${d}`).join('\n') + '\n\n'
  }

  // 4. 행동 지침
  if (modification.promptAdditions.length > 0) {
    systemPrompt += '### 행동 특성\n'
    systemPrompt += modification.promptAdditions.map(p => `- ${p}`).join('\n') + '\n\n'
  }

  // 5. 권장사항
  if (modification.encouragements.length > 0) {
    systemPrompt += '### 권장사항\n'
    systemPrompt += modification.encouragements.map(e => `✓ ${e}`).join('\n') + '\n\n'
  }

  // 6. 제약사항
  if (modification.constraints.length > 0) {
    systemPrompt += '### 제약사항\n'
    systemPrompt += modification.constraints.map(c => `! ${c}`).join('\n') + '\n\n'
  }

  // 7. 주의사항
  if (modification.warnings.length > 0) {
    systemPrompt += '### 주의사항\n'
    systemPrompt += modification.warnings.map(w => `⚠ ${w}`).join('\n') + '\n\n'
  }

  // 8. 학습된 인사이트
  if (learnings.length > 0) {
    systemPrompt += formatLearningsForPrompt(learnings) + '\n\n'
  }

  // 9. 응답 가이드라인
  if (modification.responseGuidelines) {
    systemPrompt += modification.responseGuidelines + '\n'
  }

  return systemPrompt.trim()
}

/**
 * 간단한 행동 수정 프롬프트 (가벼운 버전)
 */
export function buildQuickBehaviorPrompt(stats: AgentStats): string {
  const profile = generateBehaviorProfile(stats)

  const traits: string[] = []

  if (profile.analyticalDepth === 'deep') {
    traits.push('데이터 중시')
  }
  if (profile.creativityLevel === 'innovative') {
    traits.push('창의적')
  }
  if (profile.leadershipMode === 'directive') {
    traits.push('주도적')
  }
  if (profile.autonomyLevel === 'high') {
    traits.push('자율적')
  }
  if (profile.experienceLevel === 'master' || profile.experienceLevel === 'expert') {
    traits.push('숙련됨')
  }

  if (traits.length === 0) {
    return ''
  }

  return `[행동 특성: ${traits.join(', ')}]`
}

// ============================================
// Export
// ============================================

export default {
  generateBehaviorProfile,
  generateBehaviorModification,
  buildBehaviorSystemPrompt,
  buildQuickBehaviorPrompt,
}
