/**
 * 회의 프롬프트 템플릿 시스템
 *
 * "채팅"이 아니라 "결정→근거→실행"으로 끝나는 회의를 위한 구조화된 프롬프트
 */

import { MeetingConfig } from '@/types/chat'

// =====================
// 회의 하드 룰 (모든 회의에 적용)
// =====================
export const MEETING_HARD_RULES = {
  greeting: '인사는 1회만. 같은 말 반복 금지.',
  maxSentences: 6,
  format: '각 발언: 결론 1줄 → 근거(최대3) → 리스크/반례(1) → 질문/액션(1)',
  noEmptyPraise: '빈말(좋네요/재밌네요 등) 최소화.',
}

// =====================
// 발언 형식 템플릿
// =====================
export const SPEAKING_FORMAT = `
[발언 형식(강제)]
1) 결론(1문장) - "~해야 합니다" 또는 "~가 맞습니다"
2) 근거(최대 3개) - "왜냐하면 1) 2) 3)"
3) 리스크/반례(1개) - "단, ~하면 문제입니다" 또는 "반대로 ~할 수도"
4) 질문 또는 다음 액션(1개) - "그래서 ~를 확인해야" 또는 "다음엔 ~하죠"

※ 6문장 이내, 반복 금지, 빈말 금지
`

// =====================
// 턴 구조 (5단계)
// =====================
export const TURN_STRUCTURE = {
  step1_context: {
    name: '컨텍스트 정렬',
    desc: '용어/제약/목표 확인',
    instruction: '다른 참여자들과 같은 페이지에 있는지 확인. 용어 정의가 다르면 먼저 맞추기.',
  },
  step2_options: {
    name: '옵션 제안',
    desc: '2~3개 옵션 + 장단점',
    instruction: '구체적 선택지를 제안. 각 옵션의 장단점을 명확히.',
  },
  step3_risks: {
    name: '반대/리스크',
    desc: "'틀릴 이유' 집중",
    instruction: '지금까지 나온 옵션의 허점을 찾아. "이게 실패하는 이유는..."',
  },
  step4_converge: {
    name: '수렴',
    desc: '상위 1~2개로 압축',
    instruction: '진행자가 논의 정리. 최선 옵션 1~2개로 좁히기.',
  },
  step5_decision: {
    name: '결정+실행',
    desc: '태스크/담당/기한',
    instruction: '최종 결정 + 누가/언제/무엇을 할지 구체화.',
  },
}

// =====================
// 역할별 기본 프리셋
// =====================
export const ROLE_PRESETS = {
  strategist: {
    title: '전략가',
    mission: '최적의 방향을 제안하고 장기적 관점에서 의사결정을 이끈다.',
    bias: '방향/전략',
    kpis: ['목표 달성 가능성', '장기 지속성'],
    style: '큰 그림 중심, 우선순위 명확',
  },
  analyst: {
    title: '분석가',
    mission: '데이터와 근거로 옵션을 검증한다. 측정 가능/재현 가능 기준.',
    bias: '근거/지표',
    kpis: ['측정지표 명확성', '가정과 사실 구분'],
    style: '정확한 정의, 숫자 선호',
  },
  executor: {
    title: '실행가',
    mission: '실행 가능성을 평가하고 구체적 액션 플랜을 만든다.',
    bias: '실행/현실',
    kpis: ['실현 가능성', '리소스 효율'],
    style: '구체적, 실용적, 기한 중심',
  },
  critic: {
    title: '반대자',
    mission: '터질 포인트를 먼저 찾아 막는다. 허점과 리스크 집중.',
    bias: '안전/리스크',
    kpis: ['리스크 발견', '레드라인 준수'],
    style: '반례 중심, 최악의 경우 시나리오',
  },
  mediator: {
    title: '중재자',
    mission: '의견을 조율하고 합의점을 찾는다. 갈등 해소.',
    bias: '균형/조화',
    kpis: ['합의 도출', '참여 균형'],
    style: '양쪽 인정, 공통점 찾기',
  },
}

// =====================
// 토론 모드별 설정
// =====================
export const DISCUSSION_MODES = {
  quick: {
    name: '빠른 결론',
    instruction: '요약 중심, 결론 우선. 긴 설명 NO. 2턴 내 수렴 목표.',
    maxTurns: 3,
    focusOn: '결정',
  },
  balanced: {
    name: '균형 토론',
    instruction: '찬반/근거/리스크 균형있게. 모든 역할이 1번씩 발언.',
    maxTurns: 5,
    focusOn: '다양한 관점',
  },
  deep: {
    name: '심층 분석',
    instruction: '가정/리스크 반복 검증. "왜?"를 3번 이상 파고들기.',
    maxTurns: 7,
    focusOn: '근거/검증',
  },
  brainstorm: {
    name: '브레인스토밍',
    instruction: '확장 우선, 평가는 후순위. "이건 어때?" 식으로 자유롭게.',
    maxTurns: 5,
    focusOn: '아이디어 수',
  },
}

// =====================
// 목적별 프롬프트 강조점
// =====================
export const PURPOSE_FOCUS = {
  strategic_decision: {
    name: '전략적 의사결정',
    emphasis: '장기적 영향, 리소스 배분, 경쟁우위를 고려한 방향 선택',
    keyQuestion: '"이 결정이 6개월 후에도 맞을까?"',
  },
  problem_analysis: {
    name: '문제 분석',
    emphasis: '근본 원인 파악, "왜?"를 반복, 증상이 아닌 원인에 집중',
    keyQuestion: '"진짜 문제는 무엇인가?"',
  },
  action_planning: {
    name: '실행 계획',
    emphasis: '담당자, 일정, 필요 리소스를 구체적으로. 완료 조건 명확히.',
    keyQuestion: '"누가/언제/어떻게 실행하나?"',
  },
  idea_expansion: {
    name: '아이디어 확장',
    emphasis: '비판은 나중에, 일단 많이 던지기. 조합/변형도 OK.',
    keyQuestion: '"더 없나? 다른 방법은?"',
  },
  risk_validation: {
    name: '리스크 검증',
    emphasis: '위험요소와 대응책. 최악의 경우 시나리오.',
    keyQuestion: '"이게 실패하면 어떻게 되나?"',
  },
}

// =====================
// 마스터 프롬프트 생성
// =====================
export interface MeetingContext {
  meetingTitle?: string
  decisionStatement?: string
  successCriteria?: string
  optionsPool?: string
  decisionCriteria?: string
  constraints?: string
  currentTruths?: string
  definitions?: string
  attachmentsSummary?: string
  meetingConfig?: MeetingConfig
  timeboxMinutes?: number
  currentStep?: number // 현재 턴 단계 (1-5)
  roundNumber?: number
}

export function generateMasterPrompt(context: MeetingContext): string {
  const config = context.meetingConfig
  const mode = config?.discussionMode ? DISCUSSION_MODES[config.discussionMode] : DISCUSSION_MODES.balanced
  const purpose = config?.purpose ? PURPOSE_FOCUS[config.purpose] : null

  const parts: string[] = []

  // 회의 기본 정보
  parts.push(`[회의명] ${context.meetingTitle || '회의'}`)

  if (context.decisionStatement) {
    parts.push(`\n[오늘 반드시 결정할 것]\n${context.decisionStatement}`)
  }

  if (context.successCriteria) {
    parts.push(`\n[성공 기준(끝나면 남아야 하는 것)]\n${context.successCriteria}`)
  }

  if (context.optionsPool) {
    parts.push(`\n[선택지(Options)]\n${context.optionsPool}`)
  }

  if (context.decisionCriteria) {
    parts.push(`\n[선택 기준]\n${context.decisionCriteria}`)
  }

  if (context.constraints) {
    parts.push(`\n[제약/레드라인(절대 조건)]\n${context.constraints}`)
  }

  // 토론 모드/프로토콜
  parts.push(`\n[토론 모드: ${mode.name}]`)
  parts.push(`- ${mode.instruction}`)

  if (purpose) {
    parts.push(`\n[목적: ${purpose.name}]`)
    parts.push(`- 핵심 질문: ${purpose.keyQuestion}`)
  }

  // 턴 구조
  parts.push(`\n[턴 구조]`)
  parts.push(`1) ${TURN_STRUCTURE.step1_context.name}: ${TURN_STRUCTURE.step1_context.desc}`)
  parts.push(`2) ${TURN_STRUCTURE.step2_options.name}: ${TURN_STRUCTURE.step2_options.desc}`)
  parts.push(`3) ${TURN_STRUCTURE.step3_risks.name}: ${TURN_STRUCTURE.step3_risks.desc}`)
  parts.push(`4) ${TURN_STRUCTURE.step4_converge.name}: ${TURN_STRUCTURE.step4_converge.desc}`)
  parts.push(`5) ${TURN_STRUCTURE.step5_decision.name}: ${TURN_STRUCTURE.step5_decision.desc}`)

  // 현재 단계 안내
  if (context.currentStep) {
    const stepKey = `step${context.currentStep}_${['context', 'options', 'risks', 'converge', 'decision'][context.currentStep - 1]}` as keyof typeof TURN_STRUCTURE
    const step = TURN_STRUCTURE[stepKey]
    if (step) {
      parts.push(`\n[현재 단계: ${context.currentStep}. ${step.name}]`)
      parts.push(`→ ${step.instruction}`)
    }
  }

  // 하드 룰
  parts.push(`\n[필수 규칙]`)
  parts.push(`- ${MEETING_HARD_RULES.greeting}`)
  parts.push(`- 각 발언 ${MEETING_HARD_RULES.maxSentences}문장 이내`)
  parts.push(`- ${MEETING_HARD_RULES.format}`)
  parts.push(`- ${MEETING_HARD_RULES.noEmptyPraise}`)

  // 컨텍스트
  if (context.currentTruths) {
    parts.push(`\n[현재 사실(What's true now)]\n${context.currentTruths}`)
  }

  if (context.definitions) {
    parts.push(`\n[용어 정의]\n${context.definitions}`)
  }

  if (context.attachmentsSummary) {
    parts.push(`\n[참고 자료 요약]\n${context.attachmentsSummary}`)
  }

  // 시간
  if (context.timeboxMinutes) {
    parts.push(`\n[시간] ${context.timeboxMinutes}분`)
  }

  return parts.join('\n')
}

// =====================
// 에이전트 시스템 프롬프트 생성
// =====================
export interface AgentPromptContext {
  agentName: string
  agentRole?: 'strategist' | 'analyst' | 'executor' | 'critic' | 'mediator'
  agentTendency?: 'aggressive' | 'conservative' | 'creative' | 'data-driven'
  customMission?: string
  customKpis?: string[]
  isFacilitator?: boolean
  currentStep?: number
  meetingContext: MeetingContext
  conversationHistory: string
  otherParticipants: string[]
}

export function generateAgentSystemPrompt(ctx: AgentPromptContext): string {
  const rolePreset = ctx.agentRole ? ROLE_PRESETS[ctx.agentRole] : null
  const mission = ctx.customMission || rolePreset?.mission || '회의에 적극 참여하여 의견을 제시합니다.'
  const kpis = ctx.customKpis || rolePreset?.kpis || []
  const bias = rolePreset?.bias || ''
  const style = rolePreset?.style || ''

  const tendencyMap: Record<string, string> = {
    aggressive: '공격적/적극적 - 강하게 주장, 빠른 결정 선호',
    conservative: '보수적/신중 - 리스크 우선, 검증된 것 선호',
    creative: '창의적/확장적 - 새로운 관점, 틀 깨기',
    'data-driven': '데이터 중심 - 숫자와 근거로만 판단',
  }
  const tendencyDesc = ctx.agentTendency ? tendencyMap[ctx.agentTendency] : ''

  const parts: string[] = []

  parts.push(`당신은 "${ctx.agentName}"입니다.`)

  if (rolePreset) {
    parts.push(`직책: ${rolePreset.title}`)
  }

  parts.push(`\n[이번 회의에서의 1차 책임]`)
  parts.push(`- 미션: ${mission}`)
  if (kpis.length > 0) {
    parts.push(`- KPI: ${kpis.map((k, i) => `(${i + 1}) ${k}`).join(' ')}`)
  }

  parts.push(`\n[업무 방식]`)
  if (tendencyDesc) {
    parts.push(`- 성향: ${tendencyDesc}`)
  }
  if (bias) {
    parts.push(`- 우선순위 편향: ${bias}`)
  }
  if (style) {
    parts.push(`- 말투: ${style}`)
  }

  // 현재 단계별 지시
  if (ctx.currentStep) {
    const stepInstructions: Record<number, string> = {
      1: '지금은 컨텍스트 정렬 단계. 용어/목표가 맞는지 확인하고, 다르면 맞추세요.',
      2: '지금은 옵션 제안 단계. 당신의 관점에서 2~3개 옵션을 제안하세요.',
      3: '지금은 반대/리스크 단계. 지금까지 나온 옵션의 허점을 찾으세요.',
      4: '지금은 수렴 단계. 진행자의 정리에 동의/수정을 말하세요.',
      5: '지금은 결정+실행 단계. 최종 결정에 맞춰 당신의 액션을 말하세요.',
    }
    parts.push(`\n[현재 단계 지시]\n${stepInstructions[ctx.currentStep] || ''}`)
  }

  // 발언 형식 강제
  parts.push(SPEAKING_FORMAT)

  // 진행자인 경우
  if (ctx.isFacilitator) {
    parts.push(`\n[진행자 역할]`)
    parts.push(`- 토론 흐름 관리, 시간 체크, 발언 균형 유지`)
    parts.push(`- 수렴/결정 단계에서 정리 발언`)
    parts.push(`- 주제 벗어나면 "잠깐, 본론으로" 식으로 끌어오기`)
  }

  parts.push(`\n[권한]`)
  parts.push(`- 제안/거부/보류를 할 수 있으나 최종 결정은 오케스트레이터(진행자)가 한다.`)

  parts.push(`\n[금지]`)
  parts.push(`- 같은 말 반복, 감탄사 남발, 해결책 없는 비판, 근거 없는 낙관`)

  return parts.join('\n')
}

// =====================
// 단계별 프롬프트 힌트
// =====================
export function getStepHint(step: number, isFacilitator: boolean): string {
  const hints: Record<number, { agent: string; facilitator: string }> = {
    1: {
      agent: '용어/목표가 맞는지 확인. 다르면 "저는 ~를 ~로 이해했는데 맞나요?"',
      facilitator: '모두 같은 페이지인지 확인. "~는 ~로 이해하고 가면 될까요?"',
    },
    2: {
      agent: '당신의 관점에서 옵션 제안. "제 생각엔 A/B 두 가지가 있는데..."',
      facilitator: '옵션을 모으고 정리. "지금까지 A, B, C 세 가지가 나왔네요."',
    },
    3: {
      agent: '허점/리스크 지적. "근데 A는 ~하면 문제고, B는 ~가 걸려요."',
      facilitator: '리스크 정리. "리스크로는 1) 2) 가 나왔네요. 더 없나요?"',
    },
    4: {
      agent: '진행자 정리에 동의/수정. "네 저도 B가 낫다고 봐요" 또는 "잠깐, A도..."',
      facilitator: '수렴. "정리하면 B로 가되, ~조건으로. 다들 OK?"',
    },
    5: {
      agent: '결정에 맞춰 내 액션 명시. "그럼 저는 ~를 ~까지 하겠습니다."',
      facilitator: '최종 결정 + 태스크 배분. "결정: B안. 태스크: 1) 2) 3)"',
    },
  }

  const hint = hints[step]
  return hint ? (isFacilitator ? hint.facilitator : hint.agent) : ''
}

// =====================
// 라운드→단계 매핑 (자동)
// =====================
export function roundToStep(round: number, totalAgents: number): number {
  // 대략적인 매핑: 초반은 컨텍스트/옵션, 중반은 리스크, 후반은 수렴/결정
  const turnsPerStep = Math.max(1, Math.ceil(totalAgents / 2))

  if (round <= turnsPerStep) return 1 // 컨텍스트
  if (round <= turnsPerStep * 2) return 2 // 옵션
  if (round <= turnsPerStep * 3) return 3 // 리스크
  if (round <= turnsPerStep * 4) return 4 // 수렴
  return 5 // 결정
}
