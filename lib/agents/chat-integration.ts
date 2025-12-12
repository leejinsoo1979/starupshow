// Chat Integration for Agent Orchestrator
// 채팅 API와 에이전트 오케스트레이터 연동

import {
  orchestrateAgents,
  AgentConfig,
  AgentResponse,
  InteractionMode,
  OrchestratorOptions,
} from './orchestrator'
import { LLMProvider } from '@/lib/llm/client'

// DB에서 가져온 에이전트를 오케스트레이터 형식으로 변환
export function convertToAgentConfig(dbAgent: any): AgentConfig {
  return {
    id: dbAgent.id,
    name: dbAgent.name,
    role: dbAgent.description || '에이전트',
    description: dbAgent.description,
    systemPrompt: dbAgent.system_prompt || `당신은 ${dbAgent.name}입니다.`,
    interactionMode: (dbAgent.interaction_mode as InteractionMode) || 'solo',
    llmProvider: (dbAgent.llm_provider as LLMProvider) || 'openai',
    llmModel: dbAgent.llm_model || dbAgent.model || 'gpt-4',
    temperature: dbAgent.temperature ?? 0.7,
    speakOrder: dbAgent.speak_order ?? 0,
    collaboratesWith: dbAgent.collaborates_with || [],
    supervisorId: dbAgent.supervisor_id || null,
  }
}

// 에이전트들의 상호작용 모드 결정
export function determineInteractionMode(agents: AgentConfig[]): InteractionMode {
  if (agents.length === 1) return 'solo'

  // 감독자가 있는지 확인
  const hasSupervisor = agents.some(a => a.supervisorId !== null)
  if (hasSupervisor) return 'supervisor'

  // 에이전트들의 모드 확인
  const modes = agents.map(a => a.interactionMode)
  const modeCount = new Map<InteractionMode, number>()
  modes.forEach(m => modeCount.set(m, (modeCount.get(m) || 0) + 1))

  // 가장 많은 모드 선택 (기본: collaborate)
  let maxMode: InteractionMode = 'collaborate'
  let maxCount = 0
  modeCount.forEach((count, mode) => {
    if (count > maxCount && mode !== 'solo') {
      maxCount = count
      maxMode = mode
    }
  })

  return maxMode
}

// 채팅방의 에이전트들에게 메시지 전달하고 응답 받기
export async function processAgentResponses(
  agents: any[], // DB에서 가져온 에이전트 목록
  userMessage: string,
  roomContext: {
    roomId: string
    roomName?: string
    roomType?: string
    isMeeting?: boolean
    meetingTopic?: string
  },
  options?: Partial<OrchestratorOptions>
): Promise<AgentResponse[]> {
  if (!agents || agents.length === 0) {
    return []
  }

  // DB 에이전트를 오케스트레이터 형식으로 변환
  const agentConfigs = agents.map(convertToAgentConfig)

  // 상호작용 모드 결정
  const mode = options?.mode || determineInteractionMode(agentConfigs)

  // 미팅 모드일 경우 토론 모드로 설정
  const effectiveMode = roomContext.isMeeting ? 'debate' : mode

  // 컨텍스트 추가된 사용자 메시지
  let contextualMessage = userMessage

  if (roomContext.isMeeting && roomContext.meetingTopic) {
    contextualMessage = `[미팅 주제: ${roomContext.meetingTopic}]\n\n${userMessage}`
  }

  // 오케스트레이터 실행
  const orchestratorOptions: OrchestratorOptions = {
    mode: effectiveMode,
    rounds: options?.rounds ?? 3,
    supervisorId: options?.supervisorId || agentConfigs.find(a => a.supervisorId === null)?.id,
  }

  try {
    const responses = await orchestrateAgents(
      agentConfigs,
      contextualMessage,
      orchestratorOptions
    )
    return responses
  } catch (error) {
    console.error('Agent orchestration error:', error)
    throw error
  }
}

// 에이전트 응답을 DB 메시지 형식으로 변환
export function convertToDbMessage(
  response: AgentResponse,
  roomId: string
): any {
  return {
    room_id: roomId,
    sender_type: 'agent',
    sender_agent_id: response.agentId,
    message_type: 'text',
    content: response.content,
    is_ai_response: true,
    metadata: {
      ...response.metadata,
      agent_name: response.agentName,
      timestamp: response.timestamp.toISOString(),
    },
  }
}

// 그룹 내 에이전트들 가져오기
export async function getGroupAgents(
  supabase: any,
  groupId: string
): Promise<any[]> {
  const { data: members, error: membersError } = await supabase
    .from('agent_group_members')
    .select(`
      *,
      agent:deployed_agents(*)
    `)
    .eq('group_id', groupId)
    .order('speak_order', { ascending: true })

  if (membersError) {
    console.error('Failed to fetch group members:', membersError)
    return []
  }

  return members?.map((m: any) => ({
    ...m.agent,
    speak_order: m.speak_order,
    role_in_group: m.role,
  })) || []
}

// 채팅방의 모든 에이전트 가져오기
export async function getRoomAgents(
  supabase: any,
  roomId: string
): Promise<any[]> {
  // 채팅방 참여자 중 에이전트 조회
  const { data: participants, error: participantsError } = await supabase
    .from('chat_participants')
    .select('agent_id')
    .eq('room_id', roomId)
    .eq('participant_type', 'agent')
    .not('agent_id', 'is', null)

  if (participantsError || !participants?.length) {
    return []
  }

  const agentIds = participants.map((p: any) => p.agent_id)

  // 에이전트 상세 정보 조회
  const { data: agents, error: agentsError } = await supabase
    .from('deployed_agents')
    .select('*')
    .in('id', agentIds)
    .order('speak_order', { ascending: true })

  if (agentsError) {
    console.error('Failed to fetch agents:', agentsError)
    return []
  }

  return agents || []
}
