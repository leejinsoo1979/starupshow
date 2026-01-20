export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'
import { createClient } from '@/lib/supabase/server'
import {
  generateSuperAgentResponseStream,
  SuperAgentMessage,
  StreamEvent,
} from '@/lib/ai/super-agent-chat'
import { getLLMConfigForAgent } from '@/lib/llm/user-keys'

/**
 * SSE 스트리밍 채팅 엔드포인트
 * - 실시간으로 에이전트의 사고 과정, 도구 사용, 응답 표시
 * - 젠스파크/Manus 스타일 진행 상황 표시
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const encoder = new TextEncoder()

  try {
    const { id: agentId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 인증 확인
    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '인증이 필요합니다' })}\n\n`),
        {
          status: 401,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    const body = await request.json()
    const { message, conversation_history = [], projectPath } = body

    if (!message || typeof message !== 'string') {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '메시지가 필요합니다' })}\n\n`),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    // 에이전트 조회
    const { data: agent, error: agentError } = await (adminClient as any)
      .from('deployed_agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '에이전트를 찾을 수 없습니다' })}\n\n`),
        {
          status: 404,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }

    // 에이전트 정체성 조회
    const { data: identity } = await (adminClient as any)
      .from('agent_identity')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    // 사용자 프로필 조회
    const { data: userProfile } = await (adminClient as any)
      .from('users')
      .select('name, job_title')
      .eq('id', user.id)
      .single()

    // 사용자 LLM API 키 가져오기
    let userApiKey: string | undefined
    try {
      const provider = agent.llm_provider || 'grok'
      const llmConfig = await getLLMConfigForAgent(user.id, provider)
      userApiKey = llmConfig.apiKey
    } catch (keyError) {
      console.warn('[StreamChat] Failed to fetch user LLM key:', keyError)
    }

    // 채팅 히스토리 변환
    const superAgentHistory: SuperAgentMessage[] = conversation_history.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })
    )

    const userName = userProfile?.name || user.email?.split('@')[0] || '사용자'

    // SSE 스트리밍 응답
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const generator = generateSuperAgentResponseStream(
            { ...agent, identity, apiKey: userApiKey },
            message,
            superAgentHistory,
            {
              projectPath: projectPath || null,
              userName,
              userRole: userProfile?.job_title,
              companyId: agent.company_id || null,
              userId: user.id,
            }
          )

          // 이벤트 스트리밍
          for await (const event of generator) {
            const data = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(data))

            // done 이벤트면 종료
            if (event.type === 'done' || event.type === 'error') {
              break
            }
          }

          controller.close()
        } catch (error: any) {
          console.error('[StreamChat] Error:', error)
          const errorEvent: StreamEvent = {
            type: 'error',
            error: error.message || '스트리밍 중 오류 발생',
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // nginx 버퍼링 비활성화
      },
    })
  } catch (error: any) {
    console.error('[StreamChat] Setup error:', error)
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    )
  }
}
