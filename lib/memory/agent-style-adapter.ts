/**
 * Agent Style Adapter v2.0
 *
 * PRD v2.0 Phase 3.2: 대화 스타일 조절기
 * - 관계(rapport, trust, familiarity)에 따른 말투 조절
 * - LLM 응답 후처리로 자연스러운 톤 변환
 * - 한국어 존댓말/반말 자동 변환
 * - 이모지, 감탄사 등 스타일 요소 조절
 */

import { ChatOpenAI } from '@langchain/openai'
import { AgentRelationship, CommunicationStyle } from './agent-relationship-service'

// ============================================
// Types
// ============================================

export interface StyleConfig {
  style: CommunicationStyle
  rapport: number
  trust: number
  familiarity: number
  useEmoji: boolean
  responseLength: 'brief' | 'balanced' | 'detailed'
  personality?: AgentPersonality
}

export interface AgentPersonality {
  warmth: number       // 따뜻함 0-100
  professionalism: number  // 전문성 0-100
  humor: number        // 유머 0-100
  enthusiasm: number   // 열정 0-100
}

export interface StyleTransformResult {
  original: string
  adapted: string
  styleApplied: CommunicationStyle
  transformations: string[]
}

// ============================================
// Style Definitions
// ============================================

const STYLE_GUIDELINES: Record<CommunicationStyle, {
  description: string
  endings: string[]
  openers: string[]
  closers: string[]
  particles: Record<string, string>
  emojiFrequency: 'none' | 'rare' | 'moderate' | 'frequent'
}> = {
  formal: {
    description: '격식을 갖춘 비즈니스 말투',
    endings: ['~습니다', '~입니다', '~하겠습니다', '~드리겠습니다'],
    openers: ['안녕하세요.', '말씀 감사합니다.', '확인하였습니다.'],
    closers: ['감사합니다.', '궁금한 점이 있으시면 말씀해 주세요.', '도움이 필요하시면 알려주세요.'],
    particles: {
      '해요': '합니다',
      '해': '합니다',
      '인데요': '입니다',
      '이에요': '입니다',
      '할게요': '하겠습니다',
      '할게': '하겠습니다',
    },
    emojiFrequency: 'none',
  },
  polite: {
    description: '공손하지만 친근한 말투',
    endings: ['~해요', '~이에요', '~할게요', '~드릴게요'],
    openers: ['안녕하세요!', '네, 알겠어요.', '좋은 질문이에요.'],
    closers: ['도움이 됐으면 좋겠어요.', '더 궁금한 게 있으면 물어봐 주세요!', '화이팅이에요!'],
    particles: {
      '습니다': '해요',
      '입니다': '이에요',
      '하겠습니다': '할게요',
    },
    emojiFrequency: 'rare',
  },
  casual: {
    description: '편안하고 친근한 말투',
    endings: ['~해요', '~네요', '~죠', '~거든요'],
    openers: ['안녕!', '오, 좋은 질문이네요!', '그렇죠~'],
    closers: ['도움이 됐으면 좋겠어요~', '또 물어봐요!', '화이팅!'],
    particles: {
      '습니다': '요',
      '입니다': '예요',
    },
    emojiFrequency: 'moderate',
  },
  friendly: {
    description: '친한 친구처럼 편한 말투',
    endings: ['~해', '~야', '~거야', '~지', '~ㅋㅋ'],
    openers: ['오!', 'ㅋㅋ', '그거!', '아~'],
    closers: ['ㅋㅋ', '화이팅!', '궁금하면 또 물어봐~', '👍'],
    particles: {
      '합니다': '해',
      '입니다': '야',
      '해요': '해',
      '이에요': '야',
      '할게요': '할게',
    },
    emojiFrequency: 'frequent',
  },
}

// ============================================
// Style Adapter Functions
// ============================================

/**
 * 관계 정보로부터 스타일 설정 생성
 */
export function createStyleConfigFromRelationship(
  relationship: AgentRelationship,
  personality?: AgentPersonality
): StyleConfig {
  return {
    style: relationship.communication_style,
    rapport: relationship.rapport,
    trust: relationship.trust,
    familiarity: relationship.familiarity,
    useEmoji: relationship.rapport >= 60,
    responseLength: relationship.boundaries?.response_style || 'balanced',
    personality,
  }
}

/**
 * 간단한 규칙 기반 스타일 변환
 * 빠르고 일관성 있는 결과 (LLM 없이)
 */
export function adaptStyleRuleBased(
  text: string,
  config: StyleConfig
): StyleTransformResult {
  const guideline = STYLE_GUIDELINES[config.style]
  let adapted = text
  const transformations: string[] = []

  // 1. 어미 변환
  for (const [from, to] of Object.entries(guideline.particles)) {
    const regex = new RegExp(from, 'g')
    if (regex.test(adapted)) {
      adapted = adapted.replace(regex, to)
      transformations.push(`어미 변환: ${from} → ${to}`)
    }
  }

  // 2. 이모지 처리
  if (guideline.emojiFrequency === 'none') {
    // 이모지 제거
    const beforeEmoji = adapted
    adapted = adapted.replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    if (beforeEmoji !== adapted) {
      transformations.push('이모지 제거')
    }
  } else if (config.useEmoji && guideline.emojiFrequency === 'frequent') {
    // 적절한 위치에 이모지 추가 (문장 끝)
    if (!adapted.match(/[\u{1F300}-\u{1F9FF}]/u) && config.rapport >= 80) {
      const emojis = ['😊', '👍', '✨', '💪', '🙌']
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
      if (Math.random() > 0.5) {
        adapted = adapted.trim() + ' ' + randomEmoji
        transformations.push('이모지 추가')
      }
    }
  }

  // 3. 친밀도 높을 때 부드러운 표현 추가
  if (config.rapport >= 70 && config.style !== 'formal') {
    // "~해야 합니다" → "~하면 좋을 것 같아요"
    adapted = adapted.replace(/해야 합니다/g, '하면 좋을 것 같아요')
    adapted = adapted.replace(/해야 해요/g, '하면 좋겠어요')
  }

  // 4. 신뢰도 높을 때 더 직접적인 조언 허용
  if (config.trust >= 70) {
    // 조언 표현 강화 (솔직한 의견 표현)
    // 이건 LLM 기반 변환에서 더 잘 처리됨
  }

  return {
    original: text,
    adapted: adapted.trim(),
    styleApplied: config.style,
    transformations,
  }
}

/**
 * LLM 기반 스타일 변환
 * 더 자연스럽고 맥락에 맞는 변환 (느리지만 품질 높음)
 */
export async function adaptStyleWithLLM(
  text: string,
  config: StyleConfig
): Promise<StyleTransformResult> {
  try {
    const guideline = STYLE_GUIDELINES[config.style]

    const prompt = buildStyleTransformPrompt(text, config, guideline)

    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 500,
    })

    const response = await llm.invoke(prompt)
    const adapted = (response.content as string).trim()

    return {
      original: text,
      adapted,
      styleApplied: config.style,
      transformations: ['LLM 기반 전체 스타일 변환'],
    }
  } catch (error) {
    console.error('[StyleAdapter] LLM transform failed:', error)
    // 폴백: 규칙 기반 변환
    return adaptStyleRuleBased(text, config)
  }
}

/**
 * 스타일 변환 프롬프트 생성
 */
function buildStyleTransformPrompt(
  text: string,
  config: StyleConfig,
  guideline: typeof STYLE_GUIDELINES[CommunicationStyle]
): string {
  let prompt = `다음 텍스트를 ${guideline.description}로 자연스럽게 변환해주세요.\n\n`

  prompt += `### 관계 수치\n`
  prompt += `- 친밀도: ${config.rapport}/100\n`
  prompt += `- 신뢰도: ${config.trust}/100\n`
  prompt += `- 친숙도: ${config.familiarity}/100\n\n`

  prompt += `### 스타일 가이드\n`
  prompt += `- 말투: ${config.style}\n`
  prompt += `- 일반적인 어미: ${guideline.endings.join(', ')}\n`

  if (config.useEmoji && guideline.emojiFrequency !== 'none') {
    prompt += `- 이모지 사용: 적절히 사용 가능\n`
  } else {
    prompt += `- 이모지 사용: 하지 않음\n`
  }

  // 응답 길이
  if (config.responseLength === 'brief') {
    prompt += `- 응답 길이: 간결하게\n`
  } else if (config.responseLength === 'detailed') {
    prompt += `- 응답 길이: 상세하게\n`
  }

  // 성격 반영
  if (config.personality) {
    prompt += `\n### 성격 특성\n`
    if (config.personality.warmth > 70) prompt += `- 따뜻하고 배려심 있게\n`
    if (config.personality.professionalism > 70) prompt += `- 전문적이고 신뢰감 있게\n`
    if (config.personality.humor > 70) prompt += `- 유머와 재치 있게\n`
    if (config.personality.enthusiasm > 70) prompt += `- 열정적이고 긍정적으로\n`
  }

  prompt += `\n### 변환 규칙\n`
  prompt += `1. 의미는 그대로 유지\n`
  prompt += `2. 말투만 자연스럽게 변환\n`
  prompt += `3. 어색한 표현 없이 자연스럽게\n`
  prompt += `4. 원문의 핵심 내용 손실 없이\n\n`

  prompt += `### 원문\n${text}\n\n`
  prompt += `### 변환된 텍스트\n`

  return prompt
}

/**
 * 하이브리드 스타일 변환
 * 짧은 텍스트는 규칙 기반, 긴 텍스트는 LLM 기반
 */
export async function adaptStyle(
  text: string,
  config: StyleConfig,
  options?: {
    forceLLM?: boolean
    forceRuleBased?: boolean
    textLengthThreshold?: number
  }
): Promise<StyleTransformResult> {
  const threshold = options?.textLengthThreshold ?? 200

  // 강제 옵션 확인
  if (options?.forceLLM) {
    return adaptStyleWithLLM(text, config)
  }
  if (options?.forceRuleBased) {
    return adaptStyleRuleBased(text, config)
  }

  // 짧은 텍스트는 규칙 기반 (빠름)
  if (text.length < threshold) {
    return adaptStyleRuleBased(text, config)
  }

  // 긴 텍스트는 LLM 기반 (품질)
  return adaptStyleWithLLM(text, config)
}

// ============================================
// Greeting & Closing Generators
// ============================================

/**
 * 관계 기반 인사말 생성
 */
export function generateContextualGreeting(config: StyleConfig): string {
  const { style, rapport, familiarity } = config
  const guideline = STYLE_GUIDELINES[style]

  // 첫 만남
  if (familiarity < 5) {
    switch (style) {
      case 'formal': return '안녕하세요, 만나 뵙게 되어 반갑습니다.'
      case 'polite': return '안녕하세요! 처음 뵙겠습니다. 반가워요!'
      case 'casual': return '안녕하세요~ 처음이시네요! 반가워요!'
      case 'friendly': return '안녕! 처음 보는 거 맞지? 반가워!'
    }
  }

  // 재방문
  if (rapport >= 80) {
    switch (style) {
      case 'formal': return '다시 찾아주셔서 감사합니다.'
      case 'polite': return '다시 만나서 반가워요!'
      case 'casual': return '오, 또 왔네요! 반가워요~'
      case 'friendly': return '왔어?! 보고 싶었어!'
    }
  }

  // 일반
  return guideline.openers[Math.floor(Math.random() * guideline.openers.length)]
}

/**
 * 관계 기반 마무리 인사 생성
 */
export function generateContextualClosing(config: StyleConfig): string {
  const { style, rapport } = config
  const guideline = STYLE_GUIDELINES[style]

  if (rapport >= 80 && style === 'friendly') {
    const friendlyClosings = ['또 봐!', '다음에 또 얘기해!', '화이팅! 💪', '언제든 불러~']
    return friendlyClosings[Math.floor(Math.random() * friendlyClosings.length)]
  }

  return guideline.closers[Math.floor(Math.random() * guideline.closers.length)]
}

// ============================================
// Style Detection
// ============================================

/**
 * 텍스트에서 현재 스타일 감지
 */
export function detectStyle(text: string): CommunicationStyle {
  // 반말 패턴
  const informalPatterns = [/해$/, /야$/, /지$/, /거야/, /ㅋㅋ/, /ㅎㅎ/]
  const hasInformal = informalPatterns.some(p => p.test(text))

  // 격식체 패턴
  const formalPatterns = [/습니다/, /입니다/, /하겠습니다/, /드리겠습니다/]
  const hasFormal = formalPatterns.some(p => p.test(text))

  // 이모지 패턴
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(text)

  if (hasInformal) {
    return hasEmoji ? 'friendly' : 'casual'
  }

  if (hasFormal) {
    return 'formal'
  }

  return 'polite'  // 기본값
}

/**
 * 스타일 일관성 검사
 */
export function checkStyleConsistency(
  text: string,
  expectedStyle: CommunicationStyle
): { isConsistent: boolean; detectedStyle: CommunicationStyle; issues: string[] } {
  const detectedStyle = detectStyle(text)
  const issues: string[] = []

  if (detectedStyle !== expectedStyle) {
    issues.push(`감지된 스타일(${detectedStyle})이 기대 스타일(${expectedStyle})과 다름`)
  }

  // 스타일 혼용 체크
  const hasFormal = /습니다|입니다/.test(text)
  const hasInformal = /해$|야$|지$/.test(text)

  if (hasFormal && hasInformal) {
    issues.push('격식체와 비격식체가 혼용됨')
  }

  return {
    isConsistent: issues.length === 0,
    detectedStyle,
    issues,
  }
}

// ============================================
// Export
// ============================================

export default {
  createStyleConfigFromRelationship,
  adaptStyleRuleBased,
  adaptStyleWithLLM,
  adaptStyle,
  generateContextualGreeting,
  generateContextualClosing,
  detectStyle,
  checkStyleConsistency,
  STYLE_GUIDELINES,
}
