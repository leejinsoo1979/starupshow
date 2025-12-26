import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { chat, getDefaultModel } from '@/lib/llm/client'
import type { LLMProvider } from '@/lib/llm/models'

/**
 * 🔥 회의 전용 Chat API
 *
 * 에이전트 간 대화를 위한 API
 * - 일반 채팅 API와 달리 "에이전트→에이전트" 대화 지원
 * - 사용자 발화와 에이전트 발화를 구분
 * - 개인 채팅 메모리 사용하지 않음
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const body = await request.json()
    const {
      agentId,           // 응답할 에이전트 ID
      agentName,         // 응답할 에이전트 이름
      systemPrompt,      // 에이전트 시스템 프롬프트 (meeting-context에서 받은 것)
      lastSpeaker,       // 마지막 발화자 이름 (사용자 or 다른 에이전트)
      lastMessage,       // 마지막 발화 내용
      conversationHistory, // 회의 대화 히스토리
      meetingTopic,      // 회의 주제
      participants,      // 참여자 목록
      sharedDocuments,   // 🔭 공유된 문서들 (비전 분석 결과 포함)
    } = body

    if (!agentId || !lastMessage) {
      return NextResponse.json({ error: 'agentId and lastMessage required' }, { status: 400 })
    }

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    const userName = user?.email?.split('@')[0] || '사용자'

    // 🔥 회의 대화용 메시지 구성
    const messages: any[] = []

    // 🔭 공유된 문서 분석 내용 요약
    let sharedDocsContext = ''
    if (sharedDocuments && Array.isArray(sharedDocuments) && sharedDocuments.length > 0) {
      const analyzedDocs = sharedDocuments
        .filter((doc: any) => doc.analysis)
        .map((doc: any) => `📄 ${doc.name}:\n${doc.analysis}`)
        .join('\n\n')

      if (analyzedDocs) {
        sharedDocsContext = `\n\n## 🔭 공유된 자료 (AI가 분석함):\n${analyzedDocs}`
      }
    }

    // 시스템 프롬프트 (공유 문서 포함)
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt + sharedDocsContext
      })
    }

    // 🔥 대화 히스토리를 적절한 역할로 변환
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const entry of conversationHistory) {
        const speaker = entry.speaker
        const text = entry.text

        if (speaker === userName) {
          // 사용자 발화 → user role
          messages.push({
            role: 'user',
            content: `[${speaker}] ${text}`
          })
        } else if (speaker === agentName) {
          // 자기 자신의 이전 발화 → assistant role
          messages.push({
            role: 'assistant',
            content: text
          })
        } else {
          // 🔥 다른 에이전트 발화 → user role이지만 에이전트임을 명시
          messages.push({
            role: 'user',
            content: `[동료 에이전트 ${speaker}] ${text}`
          })
        }
      }
    }

    // 🔥 마지막 메시지 (응답해야 할 대상)
    const isFromUser = lastSpeaker === userName
    const otherAgents = participants?.filter((p: string) => p !== agentName && p !== userName) || []
    const speakerLabel = isFromUser ? lastSpeaker : `동료 ${lastSpeaker}`

    // 🔥 토론형 프롬프트 - 맥락 유지 + 상호작용 필수
    messages.push({
      role: 'user',
      content: `[${speakerLabel}]: "${lastMessage}"

---
## ${agentName}, 대화를 이어가세요

### 🎯 핵심 규칙
1. **맥락 유지**: "${lastMessage.substring(0, 50)}..."에 대해서만 말하세요. 주제 벗어나기 금지!
2. **직접 반응**: ${lastSpeaker}가 한 말에 구체적으로 응답하세요
3. **짧게**: 1-2문장만. 독백 금지
4. **상호작용**: ${otherAgents.length > 0 ? `${otherAgents[0]}에게 의견 물어보기` : '질문하기'}

### 응답 형식
"[${lastSpeaker} 말에 대한 반응]. [다른 사람에게 질문 또는 의견 요청]"

예: "그 부분 좋은 지적이야. ${otherAgents[0] || '다른 분'}은 어떻게 생각해?"
예: "음, 난 좀 다르게 보는데, 이건 어때?"

지금 바로 응답하세요:`
    })

    console.log('[MeetingChat] Generating response for:', agentName, {
      lastSpeaker,
      historyLength: conversationHistory?.length || 0,
      messageCount: messages.length,
    })

    // 에이전트 정보 조회 (LLM 설정용)
    const { data: agent } = await (adminClient as any)
      .from('deployed_agents')
      .select('llm_provider, model')
      .eq('id', agentId)
      .single()

    // 🔥 provider 매핑 (xai → grok)
    let provider: LLMProvider = 'grok'
    if (agent?.llm_provider === 'openai') provider = 'openai'
    else if (agent?.llm_provider === 'gemini') provider = 'gemini'
    else if (agent?.llm_provider === 'qwen') provider = 'qwen'
    else if (agent?.llm_provider === 'ollama') provider = 'ollama'
    else if (agent?.llm_provider === 'grok') provider = 'grok'

    const model = agent?.model || getDefaultModel(provider)

    // LLM 호출 (통합 chat 함수 사용)
    const completion = await chat(messages, {
      provider,
      model,
      temperature: 0.8,  // 회의에서는 좀 더 자연스럽게
      maxTokens: 150,    // 짧은 응답
    })

    const response = completion.choices[0]?.message?.content || ''

    console.log('[MeetingChat] ✅ Response from', agentName, ':', response.substring(0, 100))

    return NextResponse.json({
      response,
      agentId,
      agentName,
      respondingTo: lastSpeaker,
    })

  } catch (error: any) {
    console.error('[MeetingChat] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate meeting response' },
      { status: 500 }
    )
  }
}
