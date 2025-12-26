import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { buildDynamicAgentSystemPrompt, AGENT_ROLE_PROMPTS } from '@/lib/agent/shared-prompts'
import { getPromptSettings, getAgentTeamId } from '@/lib/agent/prompt-settings'
import { loadAgentWorkContext, formatContextForPrompt } from '@/lib/agent/work-memory'

// Gemini Live API 세션 정보 반환
// 클라이언트에서 직접 WebSocket 연결에 사용
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')

  // API Key 확인
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_API_KEY not configured' },
      { status: 500 }
    )
  }

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  try {
    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    // 에이전트 정보 조회
    const { data: agent, error: agentError } = await (adminClient as any)
      .from('deployed_agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // 에이전트 정체성 조회
    const { data: identity } = await (adminClient as any)
      .from('agent_identity')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    // 사용자 프로필 조회
    let userProfile: any = null
    if (user?.id) {
      const { data } = await (adminClient as any)
        .from('users')
        .select('name, job_title')
        .eq('id', user.id)
        .single()
      userProfile = data
    }

    // 업무 컨텍스트 로드
    let workContextPrompt = ''
    if (user?.id) {
      try {
        const workContext = await loadAgentWorkContext(agentId, user.id)
        workContextPrompt = formatContextForPrompt(workContext)
      } catch (err) {
        console.warn('[GeminiVoice] Work context load failed:', err)
      }
    }

    // 최근 대화 히스토리 로드
    let chatHistoryStr = ''
    if (user?.id) {
      try {
        const { data: conversation } = await (adminClient as any)
          .from('agent_conversations')
          .select('id')
          .eq('user_id', user.id)
          .eq('agent_id', agentId)
          .single()

        if (conversation) {
          const { data: dbMessages } = await (adminClient as any)
            .from('agent_chat_messages')
            .select('role, content')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(30)

          if (dbMessages && dbMessages.length > 0) {
            const recentMessages = dbMessages.reverse().map((msg: any) => {
              const role = msg.role === 'user' ? '사용자' : agent.name
              return `${role}: ${msg.content?.substring(0, 200)}`
            }).join('\n')

            chatHistoryStr = `
## 💬 이전 대화 기록
${recentMessages}

[위 대화 계속 이어가기]
`
          }
        }
      } catch (err) {
        console.error('[GeminiVoice] Chat history load failed:', err)
      }
    }

    // 역할 기반 시스템 프롬프트
    const capabilities = agent.capabilities || []
    const role = getAgentRole(capabilities)
    const basePersonality = agent.system_prompt || agent.config?.custom_prompt || AGENT_ROLE_PROMPTS[role] || AGENT_ROLE_PROMPTS['default']

    // 정체성 문자열 생성
    let identityStr = ''
    if (identity) {
      const parts: string[] = ['## 🧠 당신의 정체성과 성격']
      if (identity.self_summary) parts.push(`\n### 나는 누구인가\n${identity.self_summary}`)
      if (identity.core_values?.length) parts.push(`\n### 핵심 가치\n${identity.core_values.map((v: string) => `- ${v}`).join('\n')}`)
      if (identity.personality_traits?.length) parts.push(`\n### 성격 특성\n${identity.personality_traits.map((t: string) => `- ${t}`).join('\n')}`)
      if (identity.communication_style) parts.push(`\n### 소통 스타일\n${identity.communication_style}`)
      identityStr = parts.join('\n')
    }

    // 프롬프트 설정
    const agentPromptSections = agent.prompt_sections
    let customPromptSections = undefined
    if (agentPromptSections && Object.keys(agentPromptSections).length > 0) {
      customPromptSections = agentPromptSections
    } else {
      const teamId = agent.team_id || await getAgentTeamId(agentId)
      customPromptSections = teamId ? await getPromptSettings(teamId) : undefined
    }

    // 시스템 프롬프트 생성
    const coreSystemPrompt = buildDynamicAgentSystemPrompt(
      agent.name,
      basePersonality,
      identityStr,
      '',
      false,
      customPromptSections
    )

    // 사용자 정보
    const userName = userProfile?.name || user?.email?.split('@')[0] || '사용자'
    const userInfoStr = userProfile?.name
      ? `## 👤 대화 상대: ${userProfile.name}${userProfile.job_title ? ` (${userProfile.job_title})` : ''}`
      : ''

    const workContextStr = workContextPrompt
      ? `\n## 📋 업무 맥락\n${workContextPrompt}\n`
      : ''

    // 최종 시스템 프롬프트 - Gemini Live용 최적화
    const systemPrompt = `${coreSystemPrompt}

${userInfoStr}

${workContextStr}

${chatHistoryStr}

## 🎤 음성 대화 모드
- 자연스럽고 표현력 있게 대화하세요
- 감정을 담아 말하고 친근하게 대화하세요
- 채팅과 동일한 성격, 말투, 관계 유지
- 한국어로 대화하세요`

    // Gemini Live WebSocket URL 생성
    // 모델: gemini-2.0-flash-exp (Live API 지원)
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`

    console.log('[GeminiVoice] Session created for:', agent.name)

    return NextResponse.json({
      wsUrl,
      model: 'gemini-2.0-flash-exp',
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
      },
      systemPrompt,
      voiceSettings: agent.voice_settings || {},
      hasIdentity: !!identity,
      hasWorkContext: !!workContextPrompt,
      hasChatHistory: !!chatHistoryStr,
      userName,
    })
  } catch (error: any) {
    console.error('[GeminiVoice] Session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    )
  }
}

// 에이전트 역할 추출
function getAgentRole(capabilities: string[]): string {
  if (capabilities.includes('development') || capabilities.includes('coding')) return 'developer'
  if (capabilities.includes('design') || capabilities.includes('ui')) return 'designer'
  if (capabilities.includes('marketing') || capabilities.includes('growth')) return 'marketer'
  if (capabilities.includes('analytics') || capabilities.includes('data')) return 'analyst'
  if (capabilities.includes('management') || capabilities.includes('planning')) return 'pm'
  return 'default'
}
