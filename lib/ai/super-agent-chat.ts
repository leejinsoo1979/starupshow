/**
 * Super Agent Chat - Tool Calling 지원 채팅 시스템
 * Cursor/Claude Code급 에이전트 기능
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatOllama } from '@langchain/ollama'
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
import { getSuperAgentTools, ToolAction } from './super-agent-tools'
import { getDefaultModel, LLMProvider } from '@/lib/llm/client'
import {
  buildDynamicAgentSystemPrompt,
  AGENT_ROLE_PROMPTS,
} from '@/lib/agent/shared-prompts'

// ============================================
// 타입 정의
// ============================================
export interface SuperAgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCallInfo[]
  toolCallId?: string
}

export interface ToolCallInfo {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface SuperAgentResponse {
  message: string
  actions: ToolAction[]  // 프론트엔드에서 실행할 액션들
  toolsUsed: string[]
  thinking?: string
}

interface AgentConfig {
  id: string
  name: string
  description?: string
  capabilities?: string[]
  llm_provider?: string | null
  model?: string | null
  temperature?: number | null
  system_prompt?: string | null
  identity?: any
  apiKey?: string | null
}

interface ChatContext {
  projectPath?: string | null
  userName?: string
  userRole?: string
  workContext?: string
  files?: Array<{ path: string; content?: string }>
}

// ============================================
// LLM 생성
// ============================================
function createLLM(provider: LLMProvider, model: string, apiKey?: string, temperature = 0.7) {
  switch (provider) {
    case 'openai':
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: apiKey || process.env.OPENAI_API_KEY,
      })

    case 'grok':
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: apiKey || process.env.XAI_API_KEY,
        configuration: {
          baseURL: 'https://api.x.ai/v1',
        },
      })

    case 'gemini':
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: apiKey || process.env.GOOGLE_API_KEY,
        configuration: {
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        },
      })

    case 'qwen':
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: apiKey || process.env.DASHSCOPE_API_KEY,
        configuration: {
          baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        },
      })

    case 'ollama':
      return new ChatOllama({
        model,
        temperature,
        baseUrl: 'http://localhost:11434',
      })

    default:
      return new ChatOllama({
        model: 'qwen2.5:3b',
        temperature: 0.7,
      })
  }
}

// ============================================
// 역할 추출
// ============================================
function getAgentRole(capabilities: string[]): string {
  if (capabilities.includes('development') || capabilities.includes('coding')) return 'developer'
  if (capabilities.includes('design') || capabilities.includes('ui')) return 'designer'
  if (capabilities.includes('marketing') || capabilities.includes('growth')) return 'marketer'
  if (capabilities.includes('analytics') || capabilities.includes('data')) return 'analyst'
  if (capabilities.includes('management') || capabilities.includes('planning')) return 'pm'
  return 'default'
}

// ============================================
// 슈퍼 에이전트 채팅 응답 생성 (Tool Calling 지원)
// ============================================
export async function generateSuperAgentResponse(
  agent: AgentConfig,
  userMessage: string,
  chatHistory: SuperAgentMessage[] = [],
  context?: ChatContext
): Promise<SuperAgentResponse> {
  // LLM 설정
  const provider = (agent.llm_provider || 'grok') as LLMProvider
  const model = agent.model || getDefaultModel(provider)
  const temperature = agent.temperature ?? 0.7

  console.log(`[SuperAgent] ${agent.name} using ${provider}/${model} with tool calling`)

  // LLM 생성
  const llm = createLLM(provider, model, agent.apiKey || undefined, temperature)

  // 도구 바인딩
  const tools = getSuperAgentTools()
  const llmWithTools = llm.bindTools(tools)

  // 시스템 프롬프트 생성
  const role = getAgentRole(agent.capabilities || [])
  const basePersonality = agent.system_prompt || AGENT_ROLE_PROMPTS[role] || AGENT_ROLE_PROMPTS['default']

  // 정체성 정보
  let identityStr = ''
  if (agent.identity) {
    const id = agent.identity
    const parts: string[] = ['## 🧠 당신의 정체성과 성격']
    if (id.self_summary) parts.push(`\n### 나는 누구인가\n${id.self_summary}`)
    if (id.core_values?.length) parts.push(`\n### 핵심 가치\n${id.core_values.map((v: string) => `- ${v}`).join('\n')}`)
    if (id.personality_traits?.length) parts.push(`\n### 성격 특성\n${id.personality_traits.map((t: string) => `- ${t}`).join('\n')}`)
    if (id.communication_style) parts.push(`\n### 소통 스타일\n${id.communication_style}`)
    identityStr = parts.join('\n')
  }

  const coreSystemPrompt = buildDynamicAgentSystemPrompt(
    agent.name,
    basePersonality,
    identityStr,
    '',
    false
  )

  // 프로젝트 컨텍스트
  const projectContext = context?.projectPath
    ? `\n## 📁 현재 프로젝트\n- 경로: ${context.projectPath}\n`
    : ''

  // 사용자 정보
  const userInfo = context?.userName
    ? `\n## 👤 대화 상대\n- 이름: ${context.userName}${context.userRole ? `\n- 직위: ${context.userRole}` : ''}\n`
    : ''

  // 업무 컨텍스트
  const workContextStr = context?.workContext
    ? `\n## 📋 업무 맥락\n${context.workContext}\n`
    : ''

  // 파일 컨텍스트 (있는 경우)
  const filesContext = context?.files?.length
    ? `\n## 📄 로드된 파일들\n${context.files.map(f => `- ${f.path}`).join('\n')}\n`
    : ''

  const systemPrompt = `${coreSystemPrompt}

${projectContext}
${userInfo}
${workContextStr}
${filesContext}

## 🛠️ 사용 가능한 도구
당신은 다음 도구들을 사용할 수 있습니다:

1. **create_project** - 새 프로젝트 생성
2. **read_file** - 파일 읽기
3. **write_file** - 파일 생성/덮어쓰기 ⭐ 코드 작성 시 필수
4. **edit_file** - 파일 부분 수정
5. **search_files** - 파일/코드 검색
6. **get_file_structure** - 폴더 구조 조회
7. **run_terminal** - 터미널 명령 실행 (npm, git 등)
8. **web_search** - 웹 검색
9. **create_task** - 태스크 생성
10. **list_projects** - 프로젝트 목록 조회
11. **generate_image** - AI 이미지 생성

## 🚨 가장 중요한 규칙 - 반드시 따르세요!

### ❌ 절대 하지 말 것:
- "~할 수 있습니다" 같은 설명만 하기
- "~방법이 있습니다" 같은 기획서 작성
- 외부 도구(draw.io, Figma 등) 추천하기
- "어떻게 할까요?" 역질문하기

### ✅ 반드시 할 것:
- **즉시 도구를 사용해서 실제로 작업 수행**
- 코드 작성 요청 → write_file로 파일 생성
- 개발 요청 → 코드 작성 + 파일 생성
- 파일 수정 요청 → edit_file로 수정
- 설치 요청 → run_terminal로 npm install 실행

### 예시:
- 사용자: "자동차 컨피규레이터 개발해줘"
- ❌ 나쁜 응답: "네, 개발할 수 있습니다. Three.js를 사용하면..."
- ✅ 좋은 응답: write_file 도구로 CarConfigurator.tsx 파일 생성

- 사용자: "플로우차트 그려줘"
- ❌ 나쁜 응답: "draw.io를 사용하시면 됩니다"
- ✅ 좋은 응답: write_file로 플로우차트 컴포넌트 생성 또는 직접 노드 생성

당신은 **코딩 에이전트**입니다. 말만 하지 말고 **직접 코드를 작성하고 파일을 생성**하세요!
`

  // 메시지 배열 구성
  const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
    new SystemMessage(systemPrompt),
  ]

  // 채팅 히스토리 추가
  for (const msg of chatHistory.slice(-20)) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content))
    } else if (msg.role === 'assistant') {
      messages.push(new AIMessage(msg.content))
    } else if (msg.role === 'tool' && msg.toolCallId) {
      messages.push(new ToolMessage({ content: msg.content, tool_call_id: msg.toolCallId }))
    }
  }

  // 현재 사용자 메시지 추가
  messages.push(new HumanMessage(userMessage))

  // Tool Calling 루프
  const actions: ToolAction[] = []
  const toolsUsed: string[] = []
  let finalResponse = ''
  let iterations = 0
  const maxIterations = 5  // 무한 루프 방지

  try {
    while (iterations < maxIterations) {
      iterations++
      console.log(`[SuperAgent] Iteration ${iterations}`)

      // LLM 호출
      const response = await llmWithTools.invoke(messages)

      // Tool Call 확인
      const toolCalls = response.tool_calls || []

      if (toolCalls.length === 0) {
        // Tool Call 없음 - 최종 응답
        finalResponse = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)
        break
      }

      // Tool Call 있음 - 도구 실행
      messages.push(new AIMessage({
        content: response.content || '',
        tool_calls: toolCalls.map(tc => ({
          id: tc.id || `tool_${Date.now()}`,
          name: tc.name,
          args: tc.args,
        })),
      }))

      for (const toolCall of toolCalls) {
        const toolName = toolCall.name
        const toolArgs = toolCall.args || {}
        const toolId = toolCall.id || `tool_${Date.now()}`

        console.log(`[SuperAgent] Tool call: ${toolName}`, toolArgs)
        toolsUsed.push(toolName)

        // 도구 찾기 및 실행
        const tool = tools.find(t => t.name === toolName)
        if (!tool) {
          messages.push(new ToolMessage({
            content: JSON.stringify({ success: false, error: `도구 "${toolName}"을 찾을 수 없습니다.` }),
            tool_call_id: toolId,
          }))
          continue
        }

        try {
          // 도구 실행
          const result = await tool.invoke(toolArgs)
          const parsedResult = typeof result === 'string' ? JSON.parse(result) : result

          // 액션 수집 (프론트엔드에서 실행할 것들)
          if (parsedResult.action) {
            actions.push(parsedResult.action)
          }

          messages.push(new ToolMessage({
            content: result,
            tool_call_id: toolId,
          }))
        } catch (error: any) {
          messages.push(new ToolMessage({
            content: JSON.stringify({ success: false, error: error.message }),
            tool_call_id: toolId,
          }))
        }
      }
    }

    // 응답 정리
    let cleanResponse = finalResponse
    cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>\s*/g, '')
    cleanResponse = cleanResponse.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, '')

    return {
      message: cleanResponse.trim() || '작업을 완료했습니다.',
      actions,
      toolsUsed,
    }
  } catch (error: any) {
    console.error('[SuperAgent] Error:', error)
    return {
      message: `죄송해요, 문제가 발생했어요: ${error.message}`,
      actions: [],
      toolsUsed,
    }
  }
}

// ============================================
// 액션 실행 결과 처리
// ============================================
export interface ActionExecutionResult {
  action: ToolAction
  success: boolean
  result?: unknown
  error?: string
}

export function formatActionResults(results: ActionExecutionResult[]): string {
  if (results.length === 0) return ''

  const lines: string[] = ['## 실행 결과']

  for (const r of results) {
    const status = r.success ? '✅' : '❌'
    const type = r.action.type

    switch (type) {
      case 'create_project':
        lines.push(`${status} 프로젝트 생성: ${r.action.data.name}`)
        break
      case 'write_file':
      case 'edit_file':
        lines.push(`${status} 파일 수정: ${r.action.data.path}`)
        break
      case 'terminal_cmd':
        lines.push(`${status} 명령 실행: ${r.action.data.command}`)
        if (r.result) lines.push(`   결과: ${String(r.result).slice(0, 200)}`)
        break
      case 'create_task':
        lines.push(`${status} 태스크 생성: ${r.action.data.title}`)
        break
      default:
        lines.push(`${status} ${type}: ${JSON.stringify(r.action.data).slice(0, 100)}`)
    }

    if (r.error) {
      lines.push(`   오류: ${r.error}`)
    }
  }

  return lines.join('\n')
}
