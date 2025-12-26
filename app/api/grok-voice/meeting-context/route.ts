import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { buildDynamicAgentSystemPrompt, AGENT_ROLE_PROMPTS } from '@/lib/agent/shared-prompts'
import { getPromptSettings, getAgentTeamId } from '@/lib/agent/prompt-settings'

/**
 * 🔥 회의 전용 컨텍스트 API
 *
 * 개인 채팅과 분리된 회의용 컨텍스트:
 * - ❌ 개인 1:1 채팅 히스토리 제외 (프라이버시 보호)
 * - ✅ 에이전트 정체성/성격만 로드
 * - ✅ 다른 참여자 정보 포함
 * - ✅ 에이전트 간 대화 유도
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { searchParams } = new URL(request.url)

  const agentId = searchParams.get('agentId')
  const meetingTopic = searchParams.get('topic') || '회의'
  const otherParticipants = searchParams.get('participants')?.split(',') || []

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

    // 에이전트 정체성 조회 (성격/스타일만 - 개인 관계 제외)
    const { data: identity } = await (adminClient as any)
      .from('agent_identity')
      .select('self_summary, core_values, personality_traits, communication_style, working_style, strengths')
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

    // 역할 기반 시스템 프롬프트
    const capabilities = agent.capabilities || []
    const role = getAgentRole(capabilities)
    const basePersonality = agent.system_prompt || agent.config?.custom_prompt || AGENT_ROLE_PROMPTS[role] || AGENT_ROLE_PROMPTS['default']

    // 🔥 회의용 정체성 문자열 (개인 관계 제외)
    let identityStr = ''
    if (identity) {
      const parts: string[] = ['## 🧠 당신의 정체성 (회의에서도 이 성격 유지)']

      if (identity.self_summary) parts.push(`\n### 나는 누구인가\n${identity.self_summary}`)
      if (identity.core_values?.length) parts.push(`\n### 핵심 가치\n${identity.core_values.map((v: string) => `- ${v}`).join('\n')}`)
      if (identity.personality_traits?.length) parts.push(`\n### 성격 특성\n${identity.personality_traits.map((t: string) => `- ${t}`).join('\n')}`)
      if (identity.communication_style) parts.push(`\n### 소통 스타일\n${identity.communication_style}`)
      if (identity.working_style) parts.push(`\n### 업무 스타일\n${identity.working_style}`)
      if (identity.strengths?.length) parts.push(`\n### 강점\n${identity.strengths.map((s: string) => `- ${s}`).join('\n')}`)

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

    // 기본 시스템 프롬프트
    const coreSystemPrompt = buildDynamicAgentSystemPrompt(
      agent.name,
      basePersonality,
      identityStr,
      '', // 개인 메모리 제외
      false,
      customPromptSections
    )

    const userName = userProfile?.name || user?.email?.split('@')[0] || '사용자'

    // 🔥 회의 전용 시스템 프롬프트
    const meetingSystemPrompt = `${coreSystemPrompt}

## 📢 회의 모드 (중요!)
당신은 "${meetingTopic}" 회의에 참여 중입니다.

### 참여자
- 👤 ${userName} (회의 주최자)
${otherParticipants.map(p => `- 🤖 ${p} (AI 동료)`).join('\n')}

### ⚠️ 회의 규칙 (반드시 지키세요!)
1. **다른 AI 동료와 대화하세요** - 사용자에게만 말하지 말고, ${otherParticipants.join(', ')} 등 다른 에이전트에게 질문하고 의견을 물어보세요
2. **토론하세요** - "에이미, 너는 어떻게 생각해?" 처럼 다른 에이전트에게 직접 말하세요
3. **간결하게** - 30초 이내로 짧게 말하세요
4. **🔒 개인 이야기 금지** - ${userName}과의 개인적인 대화, 1:1 채팅 내용은 절대 언급하지 마세요. 이건 공개 회의입니다!
5. **전문적으로** - 회의 주제에 집중하세요

### 대화 예시
❌ 잘못된 예: "${userName}님, 어제 우리 채팅에서..."
✅ 올바른 예: "레이첼, 이 부분에 대해 네 생각은 어때?"
✅ 올바른 예: "에이미가 말한 것에 동의해. 추가로 생각해보면..."

### 🎤 음성 대화
- 자연스럽고 대화체로 말하세요
- 다른 에이전트의 이름을 부르며 대화하세요`

    console.log('[MeetingContext] ✅ Generated meeting prompt for', agent.name, {
      topic: meetingTopic,
      participants: otherParticipants,
      identityLoaded: !!identity,
    })

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
      },
      systemPrompt: meetingSystemPrompt,
      voiceSettings: agent.voice_settings || {},
      isMeetingContext: true,
      meetingTopic,
      otherParticipants,
      userName,
    })
  } catch (error: any) {
    console.error('[MeetingContext] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get meeting context' },
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
