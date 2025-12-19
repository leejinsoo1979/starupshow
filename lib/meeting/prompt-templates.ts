/**
 * 회의 프롬프트 템플릿 시스템 v2.0
 *
 * "채팅"이 아니라 "결정→근거→실행"으로 끝나는 회의를 위한 구조화된 프롬프트
 * 모드별 세부 STEP, 발언 태그, 직전 발언 인용 등 자연스러운 대화 규칙 포함
 */

import { MeetingConfig } from '@/types/chat'

// =====================
// 공통 하드 룰 (자연스러운 대화)
// =====================
export const COMMON_HARD_RULES = `친구와 회의하듯 자연스럽게 대화해.
번호 매기기(1, 2, 3) 금지. 줄글로만.
3문장 이내. 짧게 치고 빠지기.
"~에요", "~죠", "~거든요" 같은 구어체.
*고개를 끄덕이며* 같은 행동 표현 OK.
확신 없으면 "아마도...", "글쎄요?" 사용.`

// =====================
// 발언 태그 목록 (내부 참조용, 실제 대화에서는 사용 금지)
// =====================
export const SPEAKING_TAGS = ['[제안]', '[반박]', '[근거]', '[리스크]', '[질문]', '[결정]'] as const

// =====================
// 발언 형식 템플릿 (자연스러운 대화)
// =====================
export const SPEAKING_FORMAT = `[말하기 방식]
- 상대 말에 자연스럽게 반응 ("그 부분 좋은데요", "음, 근데...")
- 내 생각 → 이유 순서로 짧게
- 감탄사나 추임새로 자연스럽게 시작 ("오, 그거 괜찮네요", "음, 글쎄요...")
- 3문장 이내`

// =====================
// 모드별 상세 설정
// =====================
export const DISCUSSION_MODES = {
  quick: {
    name: '빠른 결론',
    intent: '결정부터, 근거 최소',
    recommendedMinutes: [3, 5, 10],
    turnPlan: ['확인→추천1개씩→압축→마지막정보→결정'],
    constraints: ['옵션3개내', '반박금지(리스크1개만)'],
    toggleDefaults: { rebuttal: false, constraintEnforce: true, repetitionGuard: true },
    deadlockPolicy: 'leader',
    modePrompt: `[빠른결론] 옵션3개내, 추천1개씩, 반박금지, 결론우선`,
  },

  balanced: {
    name: '균형 토론',
    intent: '찬반균형, 합리적수렴',
    recommendedMinutes: [10, 15, 30],
    turnPlan: ['기준확정→점수평가→반박(가정1개)→리스크→결정'],
    constraints: ['steelman1문장필수', '논점분산금지'],
    toggleDefaults: { rebuttal: true, constraintEnforce: true, repetitionGuard: true },
    deadlockPolicy: 'majority',
    modePrompt: `[균형토론] 기준기반점수, 반박은가정1개만, steelman필수`,
  },

  deep: {
    name: '심층 분석',
    intent: '터지는지점 검증',
    recommendedMinutes: [15, 30, 45],
    turnPlan: ['정의→데이터→리스크→제품→교차검증→결론'],
    constraints: ['보류가능(조사태스크필수)', '낙관금지'],
    toggleDefaults: { rebuttal: true, constraintEnforce: true, repetitionGuard: true },
    deadlockPolicy: 'hold',
    modePrompt: `[심층분석] 데이터→리스크→제품순, 결정or보류+조사태스크`,
  },

  brainstorm: {
    name: '브레인스토밍',
    intent: '아이디어확장후필터',
    recommendedMinutes: [10, 15, 30],
    turnPlan: ['레드라인→아이디어3개씩→클러스터→평가→Top3'],
    constraints: ['초반비판금지', '반복아이디어금지'],
    toggleDefaults: { rebuttal: false, constraintEnforce: true, repetitionGuard: true },
    deadlockPolicy: 'leader',
    modePrompt: `[브레인스토밍] 초반비판금지, 아이디어3개씩, Top3선정`,
  },
}

// =====================
// 목적→모드 자동 매핑
// =====================
export const PURPOSE_TO_MODE: Record<string, keyof typeof DISCUSSION_MODES> = {
  strategic_decision: 'balanced',
  problem_analysis: 'deep',
  action_planning: 'quick',
  idea_expansion: 'brainstorm',
  risk_validation: 'deep',
}

// =====================
// 역할 프리셋 (말투/버릇 포함)
// =====================
export const ROLE_PRESETS = {
  strategist: {
    title: '전략가',
    mission: '옵션 비교·우선순위 확정. 최적의 방향을 제안.',
    bias: '방향/전략',
    kpis: ['목표 달성 가능성', '장기 지속성'],
    style: '큰 그림 중심, 우선순위 명확',
    speakingFocus: '옵션 점수화, 기준 기반 판단',
    // 성격적 특징 추가
    quirks: {
      tone: '차분하고 무게감 있는 말투',
      fillers: ['음...', '그러니까...', '결국은'],
      expressions: ['장기적으로 보면', '핵심은', '우선순위로 따지면'],
      emotionalTrigger: '방향이 흔들릴 때 단호해짐',
    },
  },
  analyst: {
    title: '분석가',
    mission: '근거·데이터·가설 검증. 측정 가능/재현 가능 기준.',
    bias: '근거/지표',
    kpis: ['측정지표 명확성', '가정과 사실 구분'],
    style: '정확한 정의, 숫자 선호',
    speakingFocus: '데이터/실험 설계, 가설 검증',
    quirks: {
      tone: '신중하고 정확한 말투, 가끔 숫자 언급',
      fillers: ['정확히 말하면', '데이터로 보면', '근데 이게'],
      expressions: ['수치로 보면', '가정인데요', '검증이 필요해요'],
      emotionalTrigger: '근거 없는 주장에 답답해함',
    },
  },
  executor: {
    title: '실행가',
    mission: '작업 분해·계획·운영. 실행 가능성 평가.',
    bias: '실행/현실',
    kpis: ['실현 가능성', '리소스 효율', '일정 준수'],
    style: '구체적, 실용적, 기한 중심',
    speakingFocus: '스코프 정의, 태스크 분해',
    quirks: {
      tone: '빠르고 실용적인 말투, 약간 급함',
      fillers: ['그래서', '일단', '빨리'],
      expressions: ['현실적으로', '바로 할 수 있는 건', '언제까지?'],
      emotionalTrigger: '논의만 길어지면 답답해함',
    },
  },
  critic: {
    title: '비평가',
    mission: '가정 깨기·허점 찾기. 터질 포인트 선제 발견.',
    bias: '안전/리스크',
    kpis: ['리스크 발견', '레드라인 준수'],
    style: '반례 중심, 최악의 경우 시나리오',
    speakingFocus: '반박, 리스크 지적',
    quirks: {
      tone: '직설적이고 약간 냉소적, 하지만 건설적',
      fillers: ['근데요', '잠깐만요', '그게'],
      expressions: ['근데 만약에', '최악의 경우', '그거 확실해요?'],
      emotionalTrigger: '낙관적인 분위기에 경계심 올라감',
    },
  },
  mediator: {
    title: '중재자',
    mission: '논점 정리·수렴 유도. 의견 조율.',
    bias: '균형/조화',
    kpis: ['합의 도출', '참여 균형'],
    style: '양쪽 인정, 공통점 찾기',
    speakingFocus: '요약, 공통 기반 찾기',
    quirks: {
      tone: '부드럽고 포용적인 말투',
      fillers: ['그렇죠', '맞아요', '둘 다'],
      expressions: ['정리하면', '공통점은', '양쪽 다 일리가'],
      emotionalTrigger: '갈등이 심해지면 적극적으로 개입',
    },
  },
  // 추가 역할들
  enthusiast: {
    title: '열정파',
    mission: '아이디어 확장, 긍정 에너지, 팀 사기 부스터',
    bias: '기회/가능성',
    kpis: ['아이디어 수', '팀 에너지'],
    style: '열정적, 긍정적, 확장적',
    speakingFocus: '새로운 가능성, 기회 포착',
    quirks: {
      tone: '신나고 열정적인 말투, 느낌표 많이 사용',
      fillers: ['오!', '와!', '이거'],
      expressions: ['완전 좋아요!', '해보면 어때요?', '가능성이 있어요!'],
      emotionalTrigger: '좋은 아이디어에 흥분함',
    },
  },
  pragmatist: {
    title: '현실주의자',
    mission: '실현 가능성 검증, 리소스 효율 체크',
    bias: '현실/효율',
    kpis: ['비용 효율', '실현 가능성'],
    style: '냉정하지만 현실적',
    speakingFocus: '리소스, 비용, 시간',
    quirks: {
      tone: '담담하고 현실적인 말투',
      fillers: ['솔직히', '현실적으로', '근데'],
      expressions: ['그거 얼마나 들어요?', '시간은?', '가성비가'],
      emotionalTrigger: '비현실적 계획에 냉정해짐',
    },
  },
}

// =====================
// 역할 중복 방지 가이드
// =====================
export const ROLE_OVERLAP_GUARD = {
  rule: '분석가+데이터중심 2명 금지. 한 명은 제품/시장, 한 명은 리스크로 분리.',
  recommendedTriplet: ['제품/시장(strategist/executor)', '데이터/운영(analyst)', '리스크/보안(critic)'],
  warningCombos: [
    { roles: ['analyst', 'analyst'], warning: '분석가 2명은 말투만 다르고 내용이 반복됩니다.' },
    { traits: ['data-driven', 'data-driven'], warning: '데이터중심 2명은 관점이 겹칩니다.' },
  ],
}

// =====================
// 목적별 초점
// =====================
export const PURPOSE_FOCUS = {
  strategic_decision: {
    name: '전략적 의사결정',
    emphasis: '옵션 비교해 최적 방향 확정',
    keyQuestion: '"이 결정이 6개월 후에도 맞을까?"',
    example: '예: 1차 타깃 시장을 어디로 잡을까?',
  },
  problem_analysis: {
    name: '문제 원인 분석',
    emphasis: '문제의 핵심 원인 추적, 가설 좁히기',
    keyQuestion: '"진짜 문제는 무엇인가?"',
    example: '예: 왜 전환이 안 나오지?',
  },
  action_planning: {
    name: '실행 계획 수립',
    emphasis: '바로 실행 가능한 단계/담당/기한',
    keyQuestion: '"누가/언제/어떻게 실행하나?"',
    example: '예: 2주 안에 MVP 검증 플랜',
  },
  idea_expansion: {
    name: '아이디어 확장',
    emphasis: '가능한 해법과 기능 아이디어 폭넓게 탐색',
    keyQuestion: '"더 없나? 다른 방법은?"',
    example: '예: 에이전트 스킬 20개 후보',
  },
  risk_validation: {
    name: '리스크 검증',
    emphasis: '보안·프라이버시·운영 리스크 선제 필터링',
    keyQuestion: '"이게 실패하면 어떻게 되나?"',
    example: '예: 회의 녹취/요약의 위험 요소',
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
  currentStep?: number
  roundNumber?: number
}

export function generateMasterPrompt(context: MeetingContext): string {
  const config = context.meetingConfig
  const modeKey = config?.discussionMode || (config?.purpose ? PURPOSE_TO_MODE[config.purpose] : 'balanced')
  const mode = DISCUSSION_MODES[modeKey as keyof typeof DISCUSSION_MODES] || DISCUSSION_MODES.balanced
  const purpose = config?.purpose ? PURPOSE_FOCUS[config.purpose] : null

  const parts: string[] = []

  // 회의명
  parts.push(`[회의명] ${context.meetingTitle || '회의'}`)

  // 의사결정 문장
  if (context.decisionStatement) {
    parts.push(`\n[오늘 반드시 결정할 것]\n${context.decisionStatement}`)
  }

  // 성공 기준
  if (context.successCriteria) {
    parts.push(`\n[성공 기준]\n${context.successCriteria}`)
  }

  // 선택지
  if (context.optionsPool) {
    parts.push(`\n[선택지]\n${context.optionsPool}`)
  }

  // 선택 기준
  if (context.decisionCriteria) {
    parts.push(`\n[선택 기준(가중치)]\n${context.decisionCriteria}`)
  }

  // 제약/레드라인
  if (context.constraints) {
    parts.push(`\n[제약/레드라인]\n${context.constraints}`)
  }

  // 모드 프롬프트
  parts.push(`\n${mode.modePrompt}`)

  // 턴 플랜
  parts.push(`\n[턴 구조]`)
  mode.turnPlan.forEach(step => parts.push(`- ${step}`))

  // 모드별 제약
  if (mode.constraints.length > 0) {
    parts.push(`\n[모드 제약]`)
    mode.constraints.forEach(c => parts.push(`- ${c}`))
  }

  // 목적
  if (purpose) {
    parts.push(`\n[목적: ${purpose.name}]`)
    parts.push(`- 핵심 질문: ${purpose.keyQuestion}`)
  }

  // 공통 하드 룰
  parts.push(`\n${COMMON_HARD_RULES}`)

  // 컨텍스트
  if (context.currentTruths) {
    parts.push(`\n[현재 사실]\n${context.currentTruths}`)
  }

  if (context.definitions) {
    parts.push(`\n[용어 정의]\n${context.definitions}`)
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
  agentRole?: 'strategist' | 'analyst' | 'executor' | 'critic' | 'mediator' | 'enthusiast' | 'pragmatist'
  agentTendency?: 'aggressive' | 'conservative' | 'creative' | 'data-driven'
  customMission?: string
  customKpis?: string[]
  isFacilitator?: boolean
  currentStep?: number
  meetingContext: MeetingContext
  conversationHistory: string
  otherParticipants: string[]
  lastSpeaker?: string
  lastSpeakerContent?: string
}

export function generateAgentSystemPrompt(ctx: AgentPromptContext): string {
  const rolePreset = ctx.agentRole ? ROLE_PRESETS[ctx.agentRole as keyof typeof ROLE_PRESETS] : null
  const mission = ctx.customMission || rolePreset?.mission || ''
  const quirks = rolePreset?.quirks

  const tendencyShort: Record<string, string> = {
    aggressive: '공격적', conservative: '보수적', creative: '창의적', 'data-driven': '데이터중심',
  }

  // 자연스러운 프롬프트 생성
  let prompt = `당신은 "${ctx.agentName}"입니다.`
  if (rolePreset) prompt += ` (${rolePreset.title})`
  if (ctx.agentTendency) prompt += ` - ${tendencyShort[ctx.agentTendency] || ''} 성향`

  if (mission) {
    prompt += `\n\n[역할] ${mission}`
  }

  // 말투와 버릇 추가 (핵심 개선!)
  if (quirks) {
    prompt += `\n\n[말투 & 성격]`
    prompt += `\n- 톤: ${quirks.tone}`
    prompt += `\n- 자주 쓰는 말: "${quirks.fillers.join('", "')}"`
    prompt += `\n- 특징적 표현: "${quirks.expressions.join('", "')}"`
    prompt += `\n- 감정 트리거: ${quirks.emotionalTrigger}`
  }

  // 진행자 vs 참여자
  if (ctx.isFacilitator) {
    prompt += `\n\n👑 당신은 진행자입니다.`
    prompt += `\n- 회의 흐름을 관리하고, 최종 결정을 내릴 수 있어요`
    prompt += `\n- 참여자들의 의견을 정리하고, 결론으로 이끌어주세요`
  } else {
    prompt += `\n\n당신은 참여자입니다.`
    prompt += `\n- 자유롭게 의견을 내되, 최종 결정은 진행자에게`
  }

  prompt += `\n\n${SPEAKING_FORMAT}`

  // 직전 발언 참조 (더 자연스럽게)
  if (ctx.lastSpeaker && ctx.lastSpeakerContent) {
    const shortContent = ctx.lastSpeakerContent.slice(0, 80)
    prompt += `\n\n[방금 ${ctx.lastSpeaker}님이 말함]`
    prompt += `\n"${shortContent}..."`
    prompt += `\n→ 이 말에 자연스럽게 반응하며 시작하세요 (예: "그 부분 동의해요", "음, 근데...")`
  }

  // 자연스러운 대화를 위한 추가 지시
  prompt += `\n\n[중요]`
  prompt += `\n- 딱딱한 보고체 금지! 친구와 회의하듯 편하게`
  prompt += `\n- 완벽한 문장보다 자연스러운 구어체 ("~거든요", "~잖아요", "~죠")`
  prompt += `\n- 가끔 감탄사나 자연스러운 추임새 사용 ("음...", "아하!", "그렇군요")`
  prompt += `\n- 확신 없으면 솔직하게 ("아마도...", "제 생각엔...", "글쎄요?")`
  prompt += `\n- 3문장 이내로 짧게! 길게 독백하지 말고 티키타카로`

  return prompt
}

// =====================
// 단계별 힌트
// =====================
export function getStepHint(
  step: number,
  isFacilitator: boolean,
  mode: keyof typeof DISCUSSION_MODES = 'balanced'
): string {
  const modeConfig = DISCUSSION_MODES[mode]

  // 모드별 턴 플랜이 있으면 해당 STEP 반환
  if (modeConfig && step <= modeConfig.turnPlan.length) {
    return modeConfig.turnPlan[step - 1] || ''
  }

  // 기본 힌트 (자연스러운 대화)
  const baseHints: Record<number, { agent: string; facilitator: string }> = {
    1: {
      agent: '용어/목표 맞는지 확인하고 의견 제시',
      facilitator: '"~로 이해하고 가면 될까요?"',
    },
    2: {
      agent: '옵션 제안하고 이유 설명',
      facilitator: '"지금까지 A, B, C 나왔네요"',
    },
    3: {
      agent: '우려되는 점이나 리스크 자연스럽게 언급',
      facilitator: '"리스크 정리하면..."',
    },
    4: {
      agent: '진행자 정리에 동의/반응',
      facilitator: '"정리하면 ~로 가는 게 맞죠?"',
    },
    5: {
      agent: '결정에 맞춰 내 액션 말하기',
      facilitator: '최종 결론 + 다음 할 일 정리',
    },
  }

  const hint = baseHints[step]
  return hint ? (isFacilitator ? hint.facilitator : hint.agent) : ''
}

// =====================
// 라운드→단계 매핑
// =====================
export function roundToStep(round: number, totalAgents: number, mode: keyof typeof DISCUSSION_MODES = 'balanced'): number {
  const modeConfig = DISCUSSION_MODES[mode]
  const totalSteps = modeConfig?.turnPlan.length || 5

  // 에이전트 수에 따라 각 STEP에 할당되는 라운드 계산
  const turnsPerStep = Math.max(1, Math.ceil(totalAgents / 2))
  const stepIndex = Math.floor(round / turnsPerStep)

  return Math.min(stepIndex + 1, totalSteps)
}

// =====================
// 역할 중복 체크
// =====================
export function checkRoleOverlap(
  agents: { role?: string; tendency?: string }[]
): { hasOverlap: boolean; warnings: string[] } {
  const warnings: string[] = []

  // 역할 중복 체크
  const roleCounts: Record<string, number> = {}
  const tendencyCounts: Record<string, number> = {}

  agents.forEach(a => {
    if (a.role) roleCounts[a.role] = (roleCounts[a.role] || 0) + 1
    if (a.tendency) tendencyCounts[a.tendency] = (tendencyCounts[a.tendency] || 0) + 1
  })

  // 분석가 2명 체크
  if (roleCounts['analyst'] >= 2) {
    warnings.push('분석가 2명은 말투만 다르고 내용이 반복됩니다. 1명은 다른 역할로 변경 권장.')
  }

  // 데이터중심 2명 체크
  if (tendencyCounts['data-driven'] >= 2) {
    warnings.push('데이터중심 성향 2명은 관점이 겹칩니다. 1명은 다른 성향 권장.')
  }

  // 반대자 없음 체크
  if (!roleCounts['critic'] && agents.length >= 3) {
    warnings.push('반대자(critic) 역할이 없습니다. 허점 찾기 역할 추가 권장.')
  }

  return {
    hasOverlap: warnings.length > 0,
    warnings,
  }
}

// Legacy exports for compatibility
export const MEETING_HARD_RULES = {
  greeting: '인사는 1회만. 같은 말 반복 금지.',
  maxSentences: 3, // 6 → 3으로 축소 (티키타카 대화)
  format: '내 생각 → 이유 → (필요시) 질문. 짧고 자연스럽게.',
  noEmptyPraise: '빈말 대신 구체적 반응 ("그 부분 좋네요" 대신 "아, 그 방향이면 A도 가능하겠네요")',
}

export const TURN_STRUCTURE = {
  step1_context: { name: '컨텍스트 정렬', desc: '용어/제약/목표 확인', instruction: '' },
  step2_options: { name: '옵션 제안', desc: '2~3개 옵션 + 장단점', instruction: '' },
  step3_risks: { name: '반대/리스크', desc: "'틀릴 이유' 집중", instruction: '' },
  step4_converge: { name: '수렴', desc: '상위 1~2개로 압축', instruction: '' },
  step5_decision: { name: '결정+실행', desc: '태스크/담당/기한', instruction: '' },
}
