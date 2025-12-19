/**
 * 회의록 AI 요약 생성기
 * DELIVERABLES 옵션에 따라 회의 내용을 분석하고 요약 생성
 */

import { ChatOpenAI } from '@langchain/openai'

// Deliverables 타입
export interface MeetingDeliverables {
  decisionSummary?: boolean      // 의사결정 요약
  actionTasks?: boolean          // 실행 태스크 생성
  agentOpinions?: boolean        // 에이전트별 의견 정리
  riskSummary?: boolean          // 반대/리스크 요약
  nextAgenda?: boolean           // 다음 회의 안건 제안
  workflowSync?: boolean         // 워크플로우 반영
}

// 회의 메시지 타입
export interface MeetingMessage {
  id: string
  content: string
  sender_type: 'user' | 'agent'
  sender_name: string
  sender_id: string
  created_at: string
}

// 참여자 타입
export interface MeetingParticipant {
  type: 'user' | 'agent'
  id: string
  name: string
  persona?: string
  job_title?: string
}

// 생성된 요약 결과
export interface GeneratedSummary {
  summary?: string                    // 전체 요약
  decisions?: string[]                // 결정 사항
  actionItems?: ActionItem[]          // 실행 태스크
  agentOpinions?: AgentOpinion[]      // 에이전트별 의견
  risks?: RiskItem[]                  // 리스크
  nextAgenda?: string[]               // 다음 안건
  keyPoints?: string[]                // 주요 논의 사항
}

export interface ActionItem {
  task: string
  assignee?: string
  deadline?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface AgentOpinion {
  agentName: string
  position: string        // 찬성/반대/중립
  mainPoints: string[]    // 주요 주장
  reasoning: string       // 근거
}

export interface RiskItem {
  risk: string
  severity: 'high' | 'medium' | 'low'
  mitigation?: string
  raisedBy?: string
}

// OpenAI 모델 초기화
function getModel() {
  return new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    openAIApiKey: process.env.OPENAI_API_KEY,
  })
}

// 메시지를 텍스트로 변환
function formatMessages(messages: MeetingMessage[]): string {
  return messages
    .map(m => `[${m.sender_name}]: ${m.content}`)
    .join('\n\n')
}

/**
 * 의사결정 요약 생성
 */
async function generateDecisionSummary(
  messages: MeetingMessage[],
  topic: string
): Promise<{ summary: string; decisions: string[]; keyPoints: string[] }> {
  const model = getModel()
  const conversation = formatMessages(messages)

  const prompt = `당신은 회의록 분석 전문가입니다.
다음 회의 내용을 분석하여 의사결정 요약을 작성하세요.

회의 주제: ${topic}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "summary": "전체 회의 요약 (2-3문장)",
  "decisions": ["결정사항1", "결정사항2", ...],
  "keyPoints": ["주요 논의사항1", "주요 논의사항2", ...]
}

규칙:
- 실제로 결정된 사항만 decisions에 포함
- 논의만 되고 결정되지 않은 것은 keyPoints에 포함
- 한국어로 작성`

  try {
    const response = await model.invoke(prompt)
    const content = response.content as string
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('[Summary] Decision summary error:', error)
  }

  return { summary: '', decisions: [], keyPoints: [] }
}

/**
 * 실행 태스크 생성
 */
async function generateActionTasks(
  messages: MeetingMessage[],
  participants: MeetingParticipant[]
): Promise<ActionItem[]> {
  const model = getModel()
  const conversation = formatMessages(messages)
  const participantNames = participants.map(p => p.name).join(', ')

  const prompt = `당신은 프로젝트 매니저입니다.
다음 회의 내용에서 실행해야 할 태스크를 추출하세요.

참여자: ${participantNames}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "tasks": [
    {
      "task": "태스크 설명",
      "assignee": "담당자 이름 (명시된 경우만)",
      "deadline": "기한 (명시된 경우만)",
      "priority": "high/medium/low"
    }
  ]
}

규칙:
- 구체적이고 실행 가능한 태스크만 추출
- 담당자가 명시되지 않았으면 assignee는 null
- 기한이 명시되지 않았으면 deadline은 null
- 한국어로 작성`

  try {
    const response = await model.invoke(prompt)
    const content = response.content as string
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.tasks || []
    }
  } catch (error) {
    console.error('[Summary] Action tasks error:', error)
  }

  return []
}

/**
 * 에이전트별 의견 정리
 */
async function generateAgentOpinions(
  messages: MeetingMessage[],
  participants: MeetingParticipant[]
): Promise<AgentOpinion[]> {
  const model = getModel()
  const conversation = formatMessages(messages)

  // 에이전트만 필터링
  const agents = participants.filter(p => p.type === 'agent')
  if (agents.length === 0) return []

  const agentInfo = agents.map(a => `${a.name}${a.job_title ? ` (${a.job_title})` : ''}`).join(', ')

  const prompt = `당신은 회의 분석가입니다.
다음 회의에서 각 AI 에이전트의 의견을 정리하세요.

참여 에이전트: ${agentInfo}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "opinions": [
    {
      "agentName": "에이전트 이름",
      "position": "찬성/반대/중립/조건부찬성",
      "mainPoints": ["주요 주장1", "주요 주장2"],
      "reasoning": "핵심 근거 요약"
    }
  ]
}

규칙:
- 각 에이전트가 실제로 말한 내용만 포함
- 추측하지 말고 발언 내용 기반으로 정리
- 한국어로 작성`

  try {
    const response = await model.invoke(prompt)
    const content = response.content as string
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.opinions || []
    }
  } catch (error) {
    console.error('[Summary] Agent opinions error:', error)
  }

  return []
}

/**
 * 반대/리스크 요약
 */
async function generateRiskSummary(
  messages: MeetingMessage[]
): Promise<RiskItem[]> {
  const model = getModel()
  const conversation = formatMessages(messages)

  const prompt = `당신은 리스크 분석가입니다.
다음 회의 내용에서 언급된 리스크와 반대 의견을 추출하세요.

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "risks": [
    {
      "risk": "리스크 설명",
      "severity": "high/medium/low",
      "mitigation": "대응방안 (언급된 경우)",
      "raisedBy": "제기한 사람"
    }
  ]
}

규칙:
- [반박], [리스크] 태그가 붙은 발언 우선 분석
- "단," "하지만" 등으로 시작하는 우려사항 포함
- 실제 언급된 리스크만 포함
- 한국어로 작성`

  try {
    const response = await model.invoke(prompt)
    const content = response.content as string
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.risks || []
    }
  } catch (error) {
    console.error('[Summary] Risk summary error:', error)
  }

  return []
}

/**
 * 다음 회의 안건 제안
 */
async function generateNextAgenda(
  messages: MeetingMessage[],
  topic: string
): Promise<string[]> {
  const model = getModel()
  const conversation = formatMessages(messages)

  const prompt = `당신은 회의 기획자입니다.
다음 회의 내용을 분석하여 후속 논의가 필요한 안건을 제안하세요.

이번 회의 주제: ${topic}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "nextAgenda": [
    "안건1: 설명",
    "안건2: 설명"
  ]
}

규칙:
- 결정되지 않고 보류된 사항
- 추가 검토가 필요하다고 언급된 사항
- 데이터/실험 결과 확인 후 재논의 필요한 사항
- 최대 5개까지
- 한국어로 작성`

  try {
    const response = await model.invoke(prompt)
    const content = response.content as string
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.nextAgenda || []
    }
  } catch (error) {
    console.error('[Summary] Next agenda error:', error)
  }

  return []
}

/**
 * 메인: 회의 요약 생성
 */
export async function generateMeetingSummary(
  messages: MeetingMessage[],
  participants: MeetingParticipant[],
  topic: string,
  deliverables: MeetingDeliverables
): Promise<GeneratedSummary> {
  console.log('[Summary] Generating meeting summary...')
  console.log('[Summary] Deliverables:', deliverables)
  console.log('[Summary] Messages count:', messages.length)

  if (messages.length === 0) {
    console.log('[Summary] No messages to summarize')
    return {}
  }

  const result: GeneratedSummary = {}

  // 1. 의사결정 요약 (기본 항상 생성)
  if (deliverables.decisionSummary !== false) {
    console.log('[Summary] Generating decision summary...')
    const decisionResult = await generateDecisionSummary(messages, topic)
    result.summary = decisionResult.summary
    result.decisions = decisionResult.decisions
    result.keyPoints = decisionResult.keyPoints
  }

  // 2. 실행 태스크 생성
  if (deliverables.actionTasks) {
    console.log('[Summary] Generating action tasks...')
    result.actionItems = await generateActionTasks(messages, participants)
  }

  // 3. 에이전트별 의견 정리
  if (deliverables.agentOpinions) {
    console.log('[Summary] Generating agent opinions...')
    result.agentOpinions = await generateAgentOpinions(messages, participants)
  }

  // 4. 반대/리스크 요약
  if (deliverables.riskSummary) {
    console.log('[Summary] Generating risk summary...')
    result.risks = await generateRiskSummary(messages)
  }

  // 5. 다음 회의 안건 제안
  if (deliverables.nextAgenda) {
    console.log('[Summary] Generating next agenda...')
    result.nextAgenda = await generateNextAgenda(messages, topic)
  }

  console.log('[Summary] Summary generation completed')
  return result
}
