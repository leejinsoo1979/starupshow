export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { createClient } from '@/lib/supabase/server'
import { generateSuperAgentResponse, SuperAgentMessage } from '@/lib/ai/super-agent-chat'

/**
 * Agent Team Chat API
 * 5개 전문 에이전트 (Orchestrator, Planner, Implementer, Tester, Reviewer)
 * 각 에이전트는 고유한 시스템 프롬프트와 역할을 가짐
 */

// 에이전트 역할별 추가 설정
const AGENT_CONFIGS: Record<string, {
  capabilities: string[]
  temperature: number
  forceToolUse: boolean
}> = {
  orchestrator: {
    capabilities: ['management', 'planning', 'routing'],
    temperature: 0.7,
    forceToolUse: false, // 오케스트레이터는 분석/계획이 주 역할
  },
  planner: {
    capabilities: ['architecture', 'design', 'planning'],
    temperature: 0.5,
    forceToolUse: false, // 플래너는 설계가 주 역할
  },
  implementer: {
    capabilities: ['development', 'coding', 'programming'],
    temperature: 0.3,
    forceToolUse: true, // 임플리멘터는 반드시 도구 사용!
  },
  tester: {
    capabilities: ['testing', 'qa', 'verification'],
    temperature: 0.4,
    forceToolUse: true, // 테스터도 테스트 코드 작성
  },
  reviewer: {
    capabilities: ['review', 'security', 'quality'],
    temperature: 0.6,
    forceToolUse: false, // 리뷰어는 분석이 주 역할
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const { message, agentRole, systemPrompt, mapId, model, agentMode, history = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: '메시지가 필요합니다' }, { status: 400 })
    }

    if (!agentRole || !AGENT_CONFIGS[agentRole]) {
      return NextResponse.json({ error: '유효한 에이전트 역할이 필요합니다' }, { status: 400 })
    }

    const agentConfig = AGENT_CONFIGS[agentRole]

    // 사용자가 선택한 모델 또는 기본값 사용
    const selectedModel = model || 'grok-3-fast'

    // Agent 모드: 사용자 선택 또는 에이전트 설정 기본값
    const useToolCalling = agentMode !== undefined ? agentMode : agentConfig.forceToolUse

    console.log(`[AgentTeam] ${agentRole} processing: "${message.substring(0, 50)}..." (model: ${selectedModel}, agent: ${useToolCalling})`)

    // 사용자 프로필 조회
    const { data: userProfile } = await adminClient
      .from('users')
      .select('name, job_title')
      .eq('id', user.id)
      .single() as { data: { name?: string; job_title?: string } | null }

    const userName = userProfile?.name || user.email?.split('@')[0] || '사용자'

    // 채팅 히스토리 변환
    const chatHistory: SuperAgentMessage[] = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }))

    // Agent 모드 또는 forceToolUse 에이전트는 Tool Calling 사용
    if (useToolCalling) {
      console.log(`[AgentTeam] ${agentRole}: Using Super Agent mode (Tool Calling)`)

      // 모델에서 provider 추출
      const getProviderFromModel = (modelId: string): string => {
        if (modelId.startsWith('grok')) return 'grok'
        if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai'
        if (modelId.startsWith('gemini')) return 'gemini'
        if (modelId.startsWith('qwen')) return 'qwen'
        if (modelId.startsWith('claude')) return 'anthropic'
        return 'grok' // 기본값
      }

      // 가상 에이전트 생성 (실제 DB 에이전트 없이 사용)
      const virtualAgent = {
        id: `agent-team-${agentRole}`,
        name: agentRole.charAt(0).toUpperCase() + agentRole.slice(1),
        description: `Agent Team ${agentRole}`,
        capabilities: agentConfig.capabilities,
        llm_provider: getProviderFromModel(selectedModel),
        model: selectedModel,
        temperature: agentConfig.temperature,
        system_prompt: systemPrompt,
        identity: null,
        apiKey: null,
      }

      try {
        const superAgentResult = await generateSuperAgentResponse(
          virtualAgent,
          message,
          chatHistory,
          {
            projectPath: null,
            userName,
            userRole: userProfile?.job_title,
            workContext: mapId ? `Neural Map ID: ${mapId}` : '',
          }
        )

        console.log(`[AgentTeam] ${agentRole} tools used: ${superAgentResult.toolsUsed.join(', ') || 'none'}`)

        return NextResponse.json({
          response: superAgentResult.message,
          actions: superAgentResult.actions,
          toolsUsed: superAgentResult.toolsUsed,
          agentRole,
        })
      } catch (error: any) {
        console.error(`[AgentTeam] ${agentRole} error:`, error)
        return NextResponse.json({
          response: `죄송합니다, ${agentRole} 에이전트에서 오류가 발생했습니다: ${error.message}`,
          agentRole,
        })
      }
    } else {
      // Agent 모드 OFF: 일반 LLM 호출 (도구 없이)
      const { ChatOpenAI } = await import('@langchain/openai')
      const { HumanMessage, SystemMessage, AIMessage } = await import('@langchain/core/messages')

      // 모델에 따른 API 설정
      const getLlmConfig = (modelId: string) => {
        if (modelId.startsWith('grok')) {
          return {
            model: modelId,
            apiKey: process.env.XAI_API_KEY,
            configuration: { baseURL: 'https://api.x.ai/v1' },
          }
        }
        if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
          return {
            model: modelId,
            apiKey: process.env.OPENAI_API_KEY,
          }
        }
        if (modelId.startsWith('gemini')) {
          return {
            model: modelId,
            apiKey: process.env.GOOGLE_API_KEY,
            configuration: { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
          }
        }
        if (modelId.startsWith('qwen')) {
          return {
            model: modelId,
            apiKey: process.env.DASHSCOPE_API_KEY,
            configuration: { baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' },
          }
        }
        // 기본값: Grok
        return {
          model: 'grok-3-fast',
          apiKey: process.env.XAI_API_KEY,
          configuration: { baseURL: 'https://api.x.ai/v1' },
        }
      }

      const llmConfig = getLlmConfig(selectedModel)
      const llm = new ChatOpenAI({
        ...llmConfig,
        temperature: agentConfig.temperature,
      })

      const messages = [
        new SystemMessage(systemPrompt + `\n\n사용자: ${userName}`),
        ...chatHistory.map((msg) =>
          msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        ),
        new HumanMessage(message),
      ]

      try {
        const result = await llm.invoke(messages)
        const responseContent = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

        return NextResponse.json({
          response: responseContent,
          agentRole,
        })
      } catch (error: any) {
        console.error(`[AgentTeam] ${agentRole} LLM error:`, error)
        return NextResponse.json({
          response: `죄송합니다, ${agentRole} 에이전트에서 오류가 발생했습니다: ${error.message}`,
          agentRole,
        })
      }
    }
  } catch (error) {
    console.error('[AgentTeam] API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'API 오류' },
      { status: 500 }
    )
  }
}
