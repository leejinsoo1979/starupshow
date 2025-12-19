/**
 * Protocol Manager - Session Room v2
 *
 * 모드별 운영 규칙 및 흐름 관리
 * - Meeting: 의사결정 수렴
 * - Presentation: 발표자 중심
 * - Debate: 진영 대결
 * - Free: 자유 토론
 */

export type SessionMode = 'meeting' | 'presentation' | 'debate' | 'free'

export type DebateTeam = 'A' | 'B' | null
export type DebateRound = 'opening' | 'cross-exam' | 'rebuttal' | 'synthesis'
export type MeetingPhase = 'discussion' | 'decision-frame' | 'voting' | 'summary'

// ============================================
// 세션 상태 타입
// ============================================

export interface SessionState {
  mode: SessionMode
  startedAt: string
  timeboxMinutes: number
  elapsedSeconds: number
  facilitatorId?: string | null

  // Meeting 모드
  meeting?: {
    phase: MeetingPhase
    decisionStatement?: string
    options?: string[]
    votes?: Record<string, string>  // participantId → option
    decisions?: Decision[]
    questionRepeatCount: number  // 같은 질문 반복 횟수
    lastQuestionHash?: string
  }

  // Presentation 모드
  presentation?: {
    presenterId: string
    currentSection: number
    totalSections: number
    isQaRound: boolean
    qaQueue: string[]  // 질문 대기열
  }

  // Debate 모드
  debate?: {
    teamA: string[]  // 참가자 IDs
    teamB: string[]
    currentRound: DebateRound
    roundOrder: DebateRound[]
    currentSpeaker?: string
    scores: {
      teamA: number
      teamB: number
    }
    arguments: DebateArgument[]
  }

  // Free 모드
  free?: {
    consecutiveQuestions: number
    loopWarningIssued: boolean
  }
}

export interface Decision {
  id: string
  statement: string
  rationale: string[]  // Why-now/Why-us 근거
  experimentPlan?: string
  riskRedlines?: string[]
  agreedBy: string[]
  createdAt: string
}

export interface DebateArgument {
  team: DebateTeam
  round: DebateRound
  participantId: string
  content: string
  evidences: string[]
  score: number
  timestamp: string
}

// ============================================
// 프로토콜 가이드 (시스템 프롬프트용)
// ============================================

export function getProtocolGuide(state: SessionState): string {
  const remainingSeconds = state.timeboxMinutes * 60 - state.elapsedSeconds
  const remainingMinutes = Math.ceil(remainingSeconds / 60)
  const timeWarning = remainingMinutes <= 2 ? '\n⏰ 시간이 얼마 남지 않았습니다!' : ''

  switch (state.mode) {
    case 'meeting':
      return getMeetingProtocolGuide(state, timeWarning)
    case 'presentation':
      return getPresentationProtocolGuide(state, timeWarning)
    case 'debate':
      return getDebateProtocolGuide(state, timeWarning)
    case 'free':
      return getFreeProtocolGuide(state, timeWarning)
    default:
      return ''
  }
}

function getMeetingProtocolGuide(state: SessionState, timeWarning: string): string {
  const meeting = state.meeting!
  let phaseGuide = ''

  switch (meeting.phase) {
    case 'discussion':
      phaseGuide = `
## 📋 현재 단계: 토론
발언 순서: 주장 → 근거(Evidence) → 반론 → 수정/합의

${meeting.questionRepeatCount >= 2 ? `
⚠️ 같은 질문이 ${meeting.questionRepeatCount}회 반복되었습니다.
→ 결정 프레임으로 전환해야 합니다. 옵션 A/B/C를 제시하세요.
` : ''}

**산출물 체크리스트:**
- [ ] Decision 1개 이상
- [ ] Why-now/Why-us 근거 5개
- [ ] 2주 실험 플랜 1개
- [ ] 리스크 레드라인 5개`
      break

    case 'decision-frame':
      phaseGuide = `
## 🎯 현재 단계: 의사결정 프레임
토론이 수렴되지 않아 강제 결정 프레임이 활성화되었습니다.

**제시된 옵션:**
${meeting.options?.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n') || '(옵션 없음)'}

참가자들은 위 옵션 중 하나를 선택하거나 수정 제안을 해야 합니다.`
      break

    case 'voting':
      phaseGuide = `
## 🗳️ 현재 단계: 투표
${meeting.decisionStatement ? `결정 사항: "${meeting.decisionStatement}"` : ''}

모든 참가자가 찬/반 또는 옵션 선택을 해야 합니다.
투표 현황: ${Object.keys(meeting.votes || {}).length}명 참여`
      break

    case 'summary':
      phaseGuide = `
## 📝 현재 단계: 요약
회의가 종료되었습니다. 최종 결정사항과 후속 조치를 정리해주세요.

**완료된 결정:**
${meeting.decisions?.map((d, i) => `${i + 1}. ${d.statement}`).join('\n') || '(없음)'}`
      break
  }

  return `
# 🏛️ 회의 모드 프로토콜${timeWarning}

${phaseGuide}

---
**규칙:**
- 근거 없이 "봤다/확인했다" 금지
- 같은 질문 2회 반복 시 결정 프레임 강제
- 타임박스 종료 시 강제 요약
`
}

function getPresentationProtocolGuide(state: SessionState, timeWarning: string): string {
  const pres = state.presentation!

  return `
# 🎤 발표 모드 프로토콜${timeWarning}

## 현재 상태
- 발표자: ${pres.presenterId}
- 섹션: ${pres.currentSection} / ${pres.totalSections}
- 상태: ${pres.isQaRound ? 'Q&A 라운드' : '발표 중'}

${pres.isQaRound ? `
## Q&A 라운드
${pres.qaQueue.length > 0
  ? `대기 중인 질문: ${pres.qaQueue.length}개`
  : '질문을 받고 있습니다.'}

청중은 질문만 가능합니다. 발표자가 답변합니다.
` : `
## 발표 진행
발표자만 발언 가능합니다.
페이지별로 "핵심 3줄"을 설명하세요.
`}

---
**흐름:**
1. 발표자가 페이지별로 "핵심 3줄" 설명
2. 데이터/도표 해석
3. Q&A 라운드
4. 발표 요약 + 반론/보완 + 실행안
`
}

function getDebateProtocolGuide(state: SessionState, timeWarning: string): string {
  const debate = state.debate!

  const roundLabels: Record<DebateRound, string> = {
    'opening': '1️⃣ Opening 주장',
    'cross-exam': '2️⃣ Cross-Exam (약점 지적)',
    'rebuttal': '3️⃣ Rebuttal (반박/수정)',
    'synthesis': '4️⃣ Synthesis (합의안/판정)',
  }

  return `
# ⚔️ 진영토론 모드 프로토콜${timeWarning}

## 현재 라운드: ${roundLabels[debate.currentRound]}

**팀 구성:**
- A팀: ${debate.teamA.length}명 (점수: ${debate.scores.teamA})
- B팀: ${debate.teamB.length}명 (점수: ${debate.scores.teamB})

${debate.currentSpeaker ? `현재 발언자: ${debate.currentSpeaker}` : ''}

## 라운드별 규칙
${debate.currentRound === 'opening' ? `
- 팀 입장 명확히 표명
- 근거(Evidence) 필수 - 근거 없는 말 = 0점
- 상대 팀 공격 금지 (다음 라운드에서)
` : ''}
${debate.currentRound === 'cross-exam' ? `
- 상대 팀 약점 2개씩 지적
- 질문 형태로 공격
- 답변자는 간결하게 대응
` : ''}
${debate.currentRound === 'rebuttal' ? `
- 지적받은 약점에 대한 수정/보완
- 새로운 근거 추가 가능
- 상대 팀 공격 가능
` : ''}
${debate.currentRound === 'synthesis' ? `
- 양측 합의안 도출 시도
- 합의 실패 시: 최종 판정 투표
- 점수 기반 승패 결정
` : ''}

---
**점수 규칙:**
- 증거 기반 주장: +1~3점
- 증거 없는 주장: 0점
- 상대 약점 유효 지적: +1점
- 효과적 반박: +2점
`
}

function getFreeProtocolGuide(state: SessionState, timeWarning: string): string {
  const free = state.free!

  let loopWarning = ''
  if (free.consecutiveQuestions >= 3) {
    loopWarning = `
⚠️ 되묻기 루프 감지! (${free.consecutiveQuestions}회 연속 질문)
→ "결론 질문으로 바꿔라" 또는 "3개 옵션 중 선택하라"
`
  } else if (free.consecutiveQuestions >= 2) {
    loopWarning = `
🔄 연속 질문 ${free.consecutiveQuestions}회 - 1회 더 질문 시 루프 경고
`
  }

  return `
# 💬 자유토론 모드 프로토콜${timeWarning}

자유롭게 발언할 수 있습니다.
${loopWarning}

---
**가이드라인:**
- 자유 발언 가능
- 근거 기반 주장 권장
- 3회 연속 질문 시 루프 방지 개입
`
}

// ============================================
// 상태 변화 감지 및 업데이트
// ============================================

export interface ProtocolAction {
  type:
    | 'PHASE_CHANGE'
    | 'FORCE_DECISION_FRAME'
    | 'START_VOTING'
    | 'REGISTER_VOTE'
    | 'COMPLETE_DECISION'
    | 'NEXT_ROUND'
    | 'TOGGLE_QA'
    | 'ADD_SCORE'
    | 'LOOP_WARNING'
    | 'TIMEBOX_END'
  payload?: any
}

export function analyzeMessage(
  message: string,
  senderId: string,
  state: SessionState
): ProtocolAction[] {
  const actions: ProtocolAction[] = []

  switch (state.mode) {
    case 'meeting':
      actions.push(...analyzeMeetingMessage(message, senderId, state))
      break
    case 'debate':
      actions.push(...analyzeDebateMessage(message, senderId, state))
      break
    case 'free':
      actions.push(...analyzeFreeMessage(message, senderId, state))
      break
  }

  return actions
}

function analyzeMeetingMessage(
  message: string,
  senderId: string,
  state: SessionState
): ProtocolAction[] {
  const actions: ProtocolAction[] = []
  const meeting = state.meeting!

  // 질문 반복 감지
  const questionHash = hashQuestion(message)
  if (questionHash === meeting.lastQuestionHash) {
    const newCount = meeting.questionRepeatCount + 1
    if (newCount >= 2 && meeting.phase === 'discussion') {
      actions.push({
        type: 'FORCE_DECISION_FRAME',
        payload: { reason: '같은 질문 2회 반복' }
      })
    }
  }

  // 투표 감지
  if (meeting.phase === 'voting') {
    const voteMatch = message.match(/(?:옵션|Option)\s*([A-Z])|찬성|반대|동의|거부/i)
    if (voteMatch) {
      actions.push({
        type: 'REGISTER_VOTE',
        payload: { participantId: senderId, vote: voteMatch[0] }
      })
    }
  }

  // 결정 완료 감지
  if (message.includes('결정:') || message.includes('[Decision]') || message.includes('최종 결정')) {
    actions.push({
      type: 'COMPLETE_DECISION',
      payload: { content: message }
    })
  }

  return actions
}

function analyzeDebateMessage(
  message: string,
  senderId: string,
  state: SessionState
): ProtocolAction[] {
  const actions: ProtocolAction[] = []
  const debate = state.debate!

  // 근거 기반 점수 계산
  const evidenceCount = (message.match(/\[Evidence:/gi) || []).length
  const altEvidenceCount = (message.match(/\(p\.\d+\)|페이지\s*\d+/gi) || []).length
  const totalEvidence = evidenceCount + altEvidenceCount

  const team = debate.teamA.includes(senderId) ? 'A' :
               debate.teamB.includes(senderId) ? 'B' : null

  if (team && totalEvidence > 0) {
    actions.push({
      type: 'ADD_SCORE',
      payload: { team, points: Math.min(totalEvidence, 3) }
    })
  }

  return actions
}

function analyzeFreeMessage(
  message: string,
  senderId: string,
  state: SessionState
): ProtocolAction[] {
  const actions: ProtocolAction[] = []
  const free = state.free!

  // 질문 패턴 감지
  const isQuestion = /\?|뭐야|어떻게|왜|언제|어디|무엇|어떤|몇|인가요|인가|입니까|입니가/.test(message)

  if (isQuestion) {
    const newCount = free.consecutiveQuestions + 1
    if (newCount >= 3 && !free.loopWarningIssued) {
      actions.push({
        type: 'LOOP_WARNING',
        payload: { count: newCount }
      })
    }
  }

  return actions
}

function hashQuestion(message: string): string {
  // 간단한 해시 - 질문의 핵심 키워드 추출
  const keywords = message
    .replace(/[?.!,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .sort()
    .join('|')
  return keywords.slice(0, 100)
}

// ============================================
// 세션 상태 업데이트
// ============================================

export function applyAction(state: SessionState, action: ProtocolAction): SessionState {
  const newState = { ...state }

  switch (action.type) {
    case 'PHASE_CHANGE':
      if (newState.meeting) {
        newState.meeting = { ...newState.meeting, phase: action.payload.phase }
      }
      break

    case 'FORCE_DECISION_FRAME':
      if (newState.meeting) {
        newState.meeting = {
          ...newState.meeting,
          phase: 'decision-frame',
          options: action.payload.options || ['A안', 'B안', '보류']
        }
      }
      break

    case 'START_VOTING':
      if (newState.meeting) {
        newState.meeting = {
          ...newState.meeting,
          phase: 'voting',
          decisionStatement: action.payload.statement,
          votes: {}
        }
      }
      break

    case 'REGISTER_VOTE':
      if (newState.meeting) {
        newState.meeting = {
          ...newState.meeting,
          votes: {
            ...newState.meeting.votes,
            [action.payload.participantId]: action.payload.vote
          }
        }
      }
      break

    case 'NEXT_ROUND':
      if (newState.debate) {
        const currentIndex = newState.debate.roundOrder.indexOf(newState.debate.currentRound)
        const nextRound = newState.debate.roundOrder[currentIndex + 1] || 'synthesis'
        newState.debate = { ...newState.debate, currentRound: nextRound }
      }
      break

    case 'ADD_SCORE':
      if (newState.debate) {
        const { team, points } = action.payload
        newState.debate = {
          ...newState.debate,
          scores: {
            ...newState.debate.scores,
            [team === 'A' ? 'teamA' : 'teamB']:
              newState.debate.scores[team === 'A' ? 'teamA' : 'teamB'] + points
          }
        }
      }
      break

    case 'LOOP_WARNING':
      if (newState.free) {
        newState.free = {
          ...newState.free,
          loopWarningIssued: true,
          consecutiveQuestions: action.payload.count
        }
      }
      break

    case 'TIMEBOX_END':
      if (newState.meeting) {
        newState.meeting = { ...newState.meeting, phase: 'summary' }
      }
      break
  }

  return newState
}

// ============================================
// 초기 상태 생성
// ============================================

export function createInitialState(
  mode: SessionMode,
  timeboxMinutes: number = 30,
  options?: {
    facilitatorId?: string
    presenterId?: string
    teamA?: string[]
    teamB?: string[]
  }
): SessionState {
  const base: SessionState = {
    mode,
    startedAt: new Date().toISOString(),
    timeboxMinutes,
    elapsedSeconds: 0,
    facilitatorId: options?.facilitatorId,
  }

  switch (mode) {
    case 'meeting':
      return {
        ...base,
        meeting: {
          phase: 'discussion',
          questionRepeatCount: 0,
          decisions: [],
        }
      }

    case 'presentation':
      return {
        ...base,
        presentation: {
          presenterId: options?.presenterId || '',
          currentSection: 1,
          totalSections: 1,
          isQaRound: false,
          qaQueue: [],
        }
      }

    case 'debate':
      return {
        ...base,
        debate: {
          teamA: options?.teamA || [],
          teamB: options?.teamB || [],
          currentRound: 'opening',
          roundOrder: ['opening', 'cross-exam', 'rebuttal', 'synthesis'],
          scores: { teamA: 0, teamB: 0 },
          arguments: [],
        }
      }

    case 'free':
      return {
        ...base,
        free: {
          consecutiveQuestions: 0,
          loopWarningIssued: false,
        }
      }

    default:
      return base
  }
}

// ============================================
// 시스템 메시지 생성
// ============================================

export function generateSystemMessage(action: ProtocolAction, state: SessionState): string | null {
  switch (action.type) {
    case 'FORCE_DECISION_FRAME':
      return `⚠️ **결정 프레임 활성화**

토론이 수렴되지 않아 의사결정 프레임으로 전환합니다.

다음 옵션 중 선택하거나 수정 제안을 해주세요:
${state.meeting?.options?.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}`

    case 'LOOP_WARNING':
      return `🔄 **되묻기 루프 감지**

연속 ${action.payload.count}회 질문이 감지되었습니다.

다음 중 하나를 선택해주세요:
1. 결론을 내리는 질문으로 바꾸기
2. 아래 3가지 옵션 중 선택하기
   - 현재 논의 유지
   - 주제 변경
   - 회의 종료`

    case 'NEXT_ROUND':
      const roundLabels: Record<DebateRound, string> = {
        'opening': 'Opening 주장',
        'cross-exam': 'Cross-Exam',
        'rebuttal': 'Rebuttal',
        'synthesis': 'Synthesis',
      }
      return `📢 **라운드 전환**

${roundLabels[state.debate?.currentRound || 'opening']} 라운드가 시작됩니다.`

    case 'TIMEBOX_END':
      return `⏰ **타임박스 종료**

회의 시간이 종료되었습니다.
강제 요약 단계로 전환합니다.`

    default:
      return null
  }
}
