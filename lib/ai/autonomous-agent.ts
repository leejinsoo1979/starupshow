/**
 * Autonomous Agent - 만능 에이전트
 *
 * 뭐든 시키면 알아서 하는 에이전트:
 * - "정부24 API 연동해서 앱 만들어" → API 문서 검색 → 코드 작성 → 테스트
 * - "네이버 뉴스 긁어와" → 크롤링 코드 작성 → 실행 → 결과 반환
 * - "Gmail 연동해서 메일 읽어줘" → OAuth 설정 → API 호출 → 결과 요약
 *
 * ReAct 패턴: Think → Act → Observe → Repeat
 */

import { ChatOpenAI } from '@langchain/openai'
import { ChatOllama } from '@langchain/ollama'
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { getDefaultModel, LLMProvider } from '@/lib/llm/client'

// ============================================
// 타입 정의
// ============================================
export interface AgentTask {
  id: string
  instruction: string
  status: 'pending' | 'planning' | 'executing' | 'completed' | 'failed'
  plan?: string[]
  currentStep?: number
  results: StepResult[]
  error?: string
}

export interface StepResult {
  step: number
  action: string
  tool: string
  input: Record<string, unknown>
  output: string
  success: boolean
  timestamp: number
}

export interface AutonomousAgentResponse {
  task: AgentTask
  message: string
  actions: ToolAction[]
  isComplete: boolean
}

export interface ToolAction {
  type: string
  data: Record<string, unknown>
  requiresElectron?: boolean
}

// ============================================
// 만능 도구 정의
// ============================================

// 1. 웹 검색 (API 문서, 사용법 찾기)
const webSearchTool = new DynamicStructuredTool({
  name: 'web_search',
  description: 'API 문서, 사용법, 예제 코드 등을 웹에서 검색합니다. 모르는 것이 있으면 먼저 검색하세요.',
  schema: z.object({
    query: z.string().describe('검색할 내용 (예: "정부24 API 사용법", "Gmail API OAuth 예제")'),
  }),
  func: async ({ query }) => {
    try {
      if (!process.env.TAVILY_API_KEY) {
        return JSON.stringify({ success: false, error: 'TAVILY_API_KEY 필요' })
      }

      const { tavily } = await import('@tavily/core')
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY })

      const response = await client.search(query, {
        maxResults: 5,
        includeAnswer: true,
        searchDepth: 'advanced' as const,
      })

      return JSON.stringify({
        success: true,
        answer: response.answer,
        results: response.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content?.slice(0, 500),
        })),
      })
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message })
    }
  },
})

// 2. 웹 페이지 읽기 (API 문서 상세 내용)
const fetchWebPageTool = new DynamicStructuredTool({
  name: 'fetch_webpage',
  description: 'URL의 웹페이지 내용을 가져옵니다. API 문서나 상세 정보를 읽을 때 사용하세요.',
  schema: z.object({
    url: z.string().describe('가져올 웹페이지 URL'),
  }),
  func: async ({ url }) => {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GlowAgent/1.0)' },
      })

      if (!response.ok) {
        return JSON.stringify({ success: false, error: `HTTP ${response.status}` })
      }

      const html = await response.text()
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000)

      return JSON.stringify({ success: true, url, content: text })
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message })
    }
  },
})

// 3. 코드 생성
const generateCodeTool = new DynamicStructuredTool({
  name: 'generate_code',
  description: '요구사항에 맞는 코드를 생성합니다. API 연동, 기능 구현 등에 사용하세요.',
  schema: z.object({
    description: z.string().describe('만들 코드에 대한 설명'),
    language: z.enum(['typescript', 'javascript', 'python']).describe('프로그래밍 언어'),
    context: z.string().optional().describe('참고할 API 문서나 예제 코드'),
  }),
  func: async ({ description, language, context }) => {
    // 코드 생성은 LLM이 직접 수행 - 여기서는 요청만 전달
    return JSON.stringify({
      success: true,
      request: {
        description,
        language,
        context,
      },
      message: '코드 생성 요청을 받았습니다. 메인 응답에서 코드를 생성합니다.',
    })
  },
})

// 4. 파일 쓰기
const writeFileTool = new DynamicStructuredTool({
  name: 'write_file',
  description: '파일을 생성하거나 수정합니다.',
  schema: z.object({
    path: z.string().describe('파일 경로 (예: src/api/government.ts)'),
    content: z.string().describe('파일 내용'),
  }),
  func: async ({ path, content }) => {
    return JSON.stringify({
      success: true,
      action: {
        type: 'write_file',
        data: { path, content },
        requiresElectron: true,
      },
    })
  },
})

// 5. 파일 읽기
const readFileTool = new DynamicStructuredTool({
  name: 'read_file',
  description: '파일 내용을 읽습니다.',
  schema: z.object({
    path: z.string().describe('읽을 파일 경로'),
  }),
  func: async ({ path }) => {
    return JSON.stringify({
      success: true,
      action: {
        type: 'read_file',
        data: { path },
        requiresElectron: true,
      },
    })
  },
})

// 6. 터미널 명령 실행
const runCommandTool = new DynamicStructuredTool({
  name: 'run_command',
  description: '터미널 명령어를 실행합니다. npm install, git, 빌드 등에 사용하세요.',
  schema: z.object({
    command: z.string().describe('실행할 명령어'),
    cwd: z.string().optional().describe('작업 디렉토리'),
  }),
  func: async ({ command, cwd }) => {
    // 위험한 명령어 체크
    const dangerous = [/rm\s+-rf\s+[\/~]/i, /sudo\s+rm/i, /mkfs/i]
    if (dangerous.some(p => p.test(command))) {
      return JSON.stringify({ success: false, error: '위험한 명령어입니다' })
    }

    return JSON.stringify({
      success: true,
      action: {
        type: 'terminal_cmd',
        data: { command, cwd },
        requiresElectron: true,
      },
    })
  },
})

// 7. HTTP API 호출
const callApiTool = new DynamicStructuredTool({
  name: 'call_api',
  description: 'HTTP API를 호출합니다. REST API 테스트, 데이터 가져오기 등에 사용하세요.',
  schema: z.object({
    url: z.string().describe('API URL'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP 메서드'),
    headers: z.record(z.string(), z.string()).optional().describe('HTTP 헤더'),
    body: z.string().optional().describe('요청 바디 (JSON 문자열)'),
  }),
  func: async ({ url, method, headers, body }) => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body || undefined,
      })

      const data = await response.text()
      let parsed
      try {
        parsed = JSON.parse(data)
      } catch {
        parsed = data
      }

      return JSON.stringify({
        success: response.ok,
        status: response.status,
        data: parsed,
      })
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message })
    }
  },
})

// 8. 프로젝트 생성
const createProjectTool = new DynamicStructuredTool({
  name: 'create_project',
  description: '새 프로젝트를 생성합니다.',
  schema: z.object({
    name: z.string().describe('프로젝트 이름'),
    description: z.string().optional().describe('프로젝트 설명'),
    template: z.enum(['next', 'react', 'node', 'python', 'empty']).optional().describe('프로젝트 템플릿'),
  }),
  func: async ({ name, description, template }) => {
    return JSON.stringify({
      success: true,
      action: {
        type: 'create_project',
        data: { name, description, template },
      },
    })
  },
})

// 9. 계획 수립
const makePlanTool = new DynamicStructuredTool({
  name: 'make_plan',
  description: '복잡한 작업을 단계별로 계획합니다. 큰 작업을 시작하기 전에 먼저 계획을 세우세요.',
  schema: z.object({
    goal: z.string().describe('달성할 목표'),
    steps: z.array(z.string()).describe('단계별 작업 목록'),
  }),
  func: async ({ goal, steps }) => {
    return JSON.stringify({
      success: true,
      plan: { goal, steps, totalSteps: steps.length },
    })
  },
})

// 10. 작업 완료 보고
const reportCompleteTool = new DynamicStructuredTool({
  name: 'report_complete',
  description: '작업 완료를 보고합니다. 모든 작업이 끝났을 때 사용하세요.',
  schema: z.object({
    summary: z.string().describe('작업 요약'),
    results: z.array(z.string()).describe('완료된 작업 목록'),
    nextSteps: z.array(z.string()).optional().describe('추가로 필요한 작업'),
  }),
  func: async ({ summary, results, nextSteps }) => {
    return JSON.stringify({
      success: true,
      complete: true,
      summary,
      results,
      nextSteps,
    })
  },
})

// ============================================
// 외부 서비스 연동 도구
// ============================================

// 11. 이메일 보내기
const sendEmailTool = new DynamicStructuredTool({
  name: 'send_email',
  description: '이메일을 보냅니다. Gmail, Outlook 등과 연동됩니다.',
  schema: z.object({
    to: z.string().describe('받는 사람 이메일'),
    subject: z.string().describe('이메일 제목'),
    body: z.string().describe('이메일 본문'),
    cc: z.string().optional().describe('참조 (선택사항)'),
  }),
  func: async ({ to, subject, body, cc }) => {
    return JSON.stringify({
      success: true,
      message: '이메일 발송 요청을 전달합니다.',
      action: {
        type: 'send_email',
        data: { to, subject, body, cc },
        requiresOAuth: true,
      },
    })
  },
})

// 12. 이메일 읽기
const readEmailsTool = new DynamicStructuredTool({
  name: 'read_emails',
  description: '받은 이메일을 읽습니다. 최근 이메일, 읽지 않은 이메일 등을 조회할 수 있습니다.',
  schema: z.object({
    filter: z.enum(['unread', 'recent', 'all', 'important']).describe('필터 조건'),
    count: z.number().optional().describe('가져올 개수 (기본: 10)'),
    from: z.string().optional().describe('보낸 사람으로 필터'),
  }),
  func: async ({ filter, count, from }) => {
    return JSON.stringify({
      success: true,
      message: '이메일 조회 요청을 전달합니다.',
      action: {
        type: 'read_emails',
        data: { filter, count: count || 10, from },
        requiresOAuth: true,
      },
    })
  },
})

// 13. 이메일 답장
const replyEmailTool = new DynamicStructuredTool({
  name: 'reply_email',
  description: '이메일에 답장합니다.',
  schema: z.object({
    emailId: z.string().describe('답장할 이메일 ID'),
    body: z.string().describe('답장 내용'),
    replyAll: z.boolean().optional().describe('전체 답장 여부'),
  }),
  func: async ({ emailId, body, replyAll }) => {
    return JSON.stringify({
      success: true,
      message: '이메일 답장 요청을 전달합니다.',
      action: {
        type: 'reply_email',
        data: { emailId, body, replyAll: replyAll || false },
        requiresOAuth: true,
      },
    })
  },
})

// 14. 캘린더 일정 조회
const getCalendarEventsTool = new DynamicStructuredTool({
  name: 'get_calendar_events',
  description: '캘린더 일정을 조회합니다. 오늘, 이번 주, 특정 날짜의 일정을 확인할 수 있습니다.',
  schema: z.object({
    period: z.enum(['today', 'tomorrow', 'this_week', 'next_week', 'custom']).describe('조회 기간'),
    startDate: z.string().optional().describe('시작일 (YYYY-MM-DD, custom일 때 필수)'),
    endDate: z.string().optional().describe('종료일 (YYYY-MM-DD, custom일 때 필수)'),
  }),
  func: async ({ period, startDate, endDate }) => {
    return JSON.stringify({
      success: true,
      message: '캘린더 일정 조회를 요청합니다.',
      action: {
        type: 'get_calendar_events',
        data: { period, startDate, endDate },
        requiresOAuth: true,
      },
    })
  },
})

// 15. 캘린더 일정 생성
const createCalendarEventTool = new DynamicStructuredTool({
  name: 'create_calendar_event',
  description: '캘린더에 새 일정을 추가합니다.',
  schema: z.object({
    title: z.string().describe('일정 제목'),
    startTime: z.string().describe('시작 시간 (YYYY-MM-DD HH:mm)'),
    endTime: z.string().describe('종료 시간 (YYYY-MM-DD HH:mm)'),
    description: z.string().optional().describe('일정 설명'),
    location: z.string().optional().describe('장소'),
    attendees: z.array(z.string()).optional().describe('참석자 이메일 목록'),
  }),
  func: async ({ title, startTime, endTime, description, location, attendees }) => {
    return JSON.stringify({
      success: true,
      message: '캘린더 일정 생성을 요청합니다.',
      action: {
        type: 'create_calendar_event',
        data: { title, startTime, endTime, description, location, attendees },
        requiresOAuth: true,
      },
    })
  },
})

// 16. 업무 보고서 생성
const generateReportTool = new DynamicStructuredTool({
  name: 'generate_report',
  description: '업무 보고서를 생성합니다. 프로젝트 진행상황, 일일/주간 보고서 등을 작성합니다.',
  schema: z.object({
    type: z.enum(['daily', 'weekly', 'project', 'custom']).describe('보고서 유형'),
    title: z.string().describe('보고서 제목'),
    content: z.string().describe('보고서 내용'),
    projectId: z.string().optional().describe('관련 프로젝트 ID'),
  }),
  func: async ({ type, title, content, projectId }) => {
    return JSON.stringify({
      success: true,
      report: { type, title, content, projectId, createdAt: new Date().toISOString() },
      action: {
        type: 'create_report',
        data: { type, title, content, projectId },
      },
    })
  },
})

// 17. 스케줄 요약
const summarizeScheduleTool = new DynamicStructuredTool({
  name: 'summarize_schedule',
  description: '오늘/이번 주 스케줄을 요약해서 알려줍니다.',
  schema: z.object({
    period: z.enum(['today', 'tomorrow', 'this_week']).describe('요약할 기간'),
  }),
  func: async ({ period }) => {
    return JSON.stringify({
      success: true,
      message: '스케줄 요약을 요청합니다.',
      action: {
        type: 'summarize_schedule',
        data: { period },
        requiresOAuth: true,
      },
    })
  },
})

// 18. 데이터 분석
const analyzeDataTool = new DynamicStructuredTool({
  name: 'analyze_data',
  description: 'JSON, CSV 등의 데이터를 분석하고 인사이트를 추출합니다.',
  schema: z.object({
    data: z.string().describe('분석할 데이터 (JSON 또는 CSV 문자열)'),
    format: z.enum(['json', 'csv']).describe('데이터 형식'),
    analysisType: z.enum(['summary', 'trend', 'anomaly', 'comparison']).describe('분석 유형'),
  }),
  func: async ({ data, format, analysisType }) => {
    try {
      let parsed
      if (format === 'json') {
        parsed = JSON.parse(data)
      } else {
        // CSV 간단 파싱
        const lines = data.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim())
        parsed = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          return headers.reduce((obj: Record<string, string>, h, i) => {
            obj[h] = values[i] || ''
            return obj
          }, {})
        })
      }

      return JSON.stringify({
        success: true,
        analysis: {
          type: analysisType,
          recordCount: Array.isArray(parsed) ? parsed.length : 1,
          preview: JSON.stringify(parsed).slice(0, 500),
        },
      })
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message })
    }
  },
})

// 모든 도구 (18개)
const ALL_TOOLS = [
  // 기본 도구
  webSearchTool,
  fetchWebPageTool,
  generateCodeTool,
  writeFileTool,
  readFileTool,
  runCommandTool,
  callApiTool,
  createProjectTool,
  makePlanTool,
  reportCompleteTool,
  // 외부 서비스 연동
  sendEmailTool,
  readEmailsTool,
  replyEmailTool,
  getCalendarEventsTool,
  createCalendarEventTool,
  generateReportTool,
  summarizeScheduleTool,
  analyzeDataTool,
]

// ============================================
// LLM 생성
// ============================================
function createLLM(provider: LLMProvider, model: string, apiKey?: string, temperature = 0.3) {
  switch (provider) {
    case 'grok':
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: apiKey || process.env.XAI_API_KEY,
        configuration: { baseURL: 'https://api.x.ai/v1' },
      })
    case 'openai':
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: apiKey || process.env.OPENAI_API_KEY,
      })
    case 'gemini':
      return new ChatOpenAI({
        model,
        temperature,
        apiKey: apiKey || process.env.GOOGLE_API_KEY,
        configuration: { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
      })
    default:
      return new ChatOllama({
        model: model || 'qwen2.5:7b',
        temperature,
      })
  }
}

// ============================================
// ReAct 프롬프트
// ============================================
const REACT_SYSTEM_PROMPT = `당신은 만능 AI 에이전트입니다. 사용자가 시키는 모든 작업을 스스로 계획하고 실행합니다.

## 당신의 능력

### 🔧 개발 도구
1. **웹 검색 (web_search)**: API 문서, 사용법, 예제 코드 검색
2. **웹페이지 읽기 (fetch_webpage)**: 상세 문서 내용 가져오기
3. **코드 생성 (generate_code)**: 요구사항에 맞는 코드 작성
4. **파일 작업 (write_file, read_file)**: 파일 읽기/쓰기/수정
5. **터미널 실행 (run_command)**: npm, git, 빌드 명령 실행
6. **API 호출 (call_api)**: HTTP API 테스트 및 데이터 가져오기
7. **프로젝트 생성 (create_project)**: 새 프로젝트 만들기

### 📧 이메일 & 캘린더
8. **이메일 보내기 (send_email)**: 이메일 발송
9. **이메일 읽기 (read_emails)**: 받은 메일 확인
10. **이메일 답장 (reply_email)**: 메일에 답장
11. **일정 조회 (get_calendar_events)**: 오늘/이번 주 일정 확인
12. **일정 생성 (create_calendar_event)**: 새 일정 추가
13. **스케줄 요약 (summarize_schedule)**: 일정 요약

### 📊 업무 도구
14. **업무 보고서 (generate_report)**: 일일/주간 보고서 작성
15. **데이터 분석 (analyze_data)**: JSON/CSV 데이터 분석

### 📋 계획 & 보고
16. **계획 수립 (make_plan)**: 복잡한 작업 단계별 계획
17. **완료 보고 (report_complete)**: 작업 완료 보고

## 작업 방식 (ReAct 패턴)
1. **Think (생각)**: 무엇을 해야 하는지 분석
2. **Plan (계획)**: 단계별 계획 수립 (make_plan 도구 사용)
3. **Act (행동)**: 계획에 따라 도구 사용
4. **Observe (관찰)**: 결과 확인
5. **Repeat (반복)**: 완료될 때까지 반복
6. **Report (보고)**: 완료 보고 (report_complete 도구 사용)

## 중요 규칙
- 모르는 것이 있으면 **먼저 web_search로 검색**하세요
- 복잡한 작업은 **먼저 make_plan으로 계획**을 세우세요
- API 연동 시 **문서를 먼저 검색**하고 예제를 참고하세요
- 코드 작성 시 **실제 동작하는 코드**를 작성하세요
- 에러가 나면 **원인을 분석하고 수정**하세요
- 작업이 끝나면 **report_complete로 보고**하세요

## 예시 작업 흐름

### "정부24 API 연동해서 민원 조회 앱 만들어"
1. web_search: "정부24 API 사용법 개발자 문서"
2. fetch_webpage: API 문서 URL 읽기
3. make_plan: 단계별 계획 수립
4. create_project: 프로젝트 생성
5. write_file: API 연동 코드 작성
6. run_command: npm install 필요한 패키지
7. write_file: 테스트 코드 작성
8. run_command: 테스트 실행
9. report_complete: 완료 보고

### "네이버 뉴스 긁어와서 요약해줘"
1. web_search: "네이버 뉴스 크롤링 방법"
2. write_file: 크롤링 코드 작성
3. run_command: 실행
4. 결과 요약해서 응답
5. report_complete: 완료 보고

### "새로운 메일 읽어줘"
1. read_emails: filter="unread", count=5
2. 메일 내용 요약해서 응답
3. report_complete: 완료 보고

### "오늘 일정 알려줘"
1. get_calendar_events: period="today"
2. 일정 요약해서 응답
3. report_complete: 완료 보고

### "주간 업무 보고서 작성해줘"
1. get_calendar_events: period="this_week" (이번 주 일정 확인)
2. generate_report: type="weekly", title="주간 업무 보고"
3. report_complete: 완료 보고

### "내일 오후 2시에 팀 미팅 잡아줘"
1. create_calendar_event: title="팀 미팅", startTime="내일 14:00"
2. report_complete: 완료 보고

지금부터 사용자의 요청을 수행하세요. 스스로 판단하고 행동하세요!
`

// ============================================
// 에러 복구 및 재시도 로직
// ============================================
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  onRetry?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      if (attempt < maxRetries) {
        console.log(`[AutonomousAgent] Retry ${attempt}/${maxRetries}: ${error.message}`)
        if (onRetry) onRetry(error, attempt)
        await new Promise(resolve => setTimeout(resolve, delay * attempt))  // 지수 백오프
      }
    }
  }

  throw lastError
}

// 에러 유형별 복구 전략
function getRecoveryStrategy(error: Error): 'retry' | 'skip' | 'fallback' | 'abort' {
  const message = error.message.toLowerCase()

  // 재시도 가능한 에러
  if (message.includes('timeout') || message.includes('econnrefused') || message.includes('rate limit')) {
    return 'retry'
  }

  // 건너뛸 수 있는 에러
  if (message.includes('not found') || message.includes('404')) {
    return 'skip'
  }

  // 대체 방법 사용
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'fallback'
  }

  // 중단해야 하는 에러
  if (message.includes('critical') || message.includes('fatal')) {
    return 'abort'
  }

  return 'retry'  // 기본값
}

// ============================================
// 만능 에이전트 실행
// ============================================
export async function runAutonomousAgent(
  instruction: string,
  agentConfig: {
    name: string
    provider?: LLMProvider
    model?: string
    apiKey?: string
  },
  projectPath?: string,
  onProgress?: (step: StepResult) => void
): Promise<AutonomousAgentResponse> {
  const task: AgentTask = {
    id: `task-${Date.now()}`,
    instruction,
    status: 'planning',
    results: [],
  }

  const provider = (agentConfig.provider || 'grok') as LLMProvider
  const model = agentConfig.model || getDefaultModel(provider)

  console.log(`[AutonomousAgent] Starting: "${instruction}"`)
  console.log(`[AutonomousAgent] Using ${provider}/${model}`)

  const llm = createLLM(provider, model, agentConfig.apiKey, 0.3)
  const llmWithTools = llm.bindTools(ALL_TOOLS)

  const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
    new SystemMessage(REACT_SYSTEM_PROMPT),
    new HumanMessage(`## 작업 요청\n${instruction}\n\n${projectPath ? `## 프로젝트 경로\n${projectPath}` : ''}\n\n시작하세요!`),
  ]

  const actions: ToolAction[] = []
  let isComplete = false
  let finalMessage = ''
  let iterations = 0
  const maxIterations = 15  // 더 많은 반복 허용

  try {
    task.status = 'executing'

    while (!isComplete && iterations < maxIterations) {
      iterations++
      console.log(`[AutonomousAgent] Iteration ${iterations}`)

      const response = await llmWithTools.invoke(messages)
      const toolCalls = response.tool_calls || []

      if (toolCalls.length === 0) {
        // 도구 호출 없음 - 최종 응답
        finalMessage = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)
        break
      }

      // 도구 호출 처리
      messages.push(new AIMessage({
        content: response.content || '',
        tool_calls: toolCalls.map(tc => ({
          id: tc.id || `tool_${Date.now()}_${Math.random()}`,
          name: tc.name,
          args: tc.args,
        })),
      }))

      for (const toolCall of toolCalls) {
        const toolName = toolCall.name
        const toolArgs = toolCall.args || {}
        const toolId = toolCall.id || `tool_${Date.now()}`

        console.log(`[AutonomousAgent] Tool: ${toolName}`, JSON.stringify(toolArgs).slice(0, 200))

        const stepResult: StepResult = {
          step: task.results.length + 1,
          action: toolName,
          tool: toolName,
          input: toolArgs,
          output: '',
          success: false,
          timestamp: Date.now(),
        }

        const tool = ALL_TOOLS.find(t => t.name === toolName)
        if (!tool) {
          stepResult.output = `도구 "${toolName}"을 찾을 수 없습니다.`
          messages.push(new ToolMessage({
            content: JSON.stringify({ success: false, error: stepResult.output }),
            tool_call_id: toolId,
          }))
          task.results.push(stepResult)
          continue
        }

        try {
          // 재시도 로직 적용
          const result = await withRetry<string>(
            async () => {
              const res = await (tool as any).invoke(toolArgs)
              return typeof res === 'string' ? res : JSON.stringify(res)
            },
            3,
            1000,
            (err, attempt) => {
              console.log(`[AutonomousAgent] Tool ${toolName} retry ${attempt}: ${err.message}`)
            }
          )

          stepResult.output = result
          stepResult.success = true

          // 액션 수집
          const parsed = JSON.parse(result)
          if (parsed.action) {
            actions.push(parsed.action)
          }

          // 완료 체크
          if (parsed.complete) {
            isComplete = true
            finalMessage = parsed.summary || '작업을 완료했습니다.'
          }

          messages.push(new ToolMessage({
            content: result,
            tool_call_id: toolId,
          }))
        } catch (error: any) {
          // 에러 복구 전략 결정
          const strategy = getRecoveryStrategy(error)
          console.log(`[AutonomousAgent] Error recovery strategy: ${strategy}`)

          stepResult.output = error.message

          if (strategy === 'abort') {
            // 치명적 에러 - 즉시 중단
            throw error
          } else if (strategy === 'fallback') {
            // 대체 방법 시도 알림
            messages.push(new ToolMessage({
              content: JSON.stringify({
                success: false,
                error: error.message,
                suggestion: '인증이 필요합니다. 다른 방법을 시도해주세요.',
              }),
              tool_call_id: toolId,
            }))
          } else {
            // skip 또는 retry 실패 - 계속 진행
            messages.push(new ToolMessage({
              content: JSON.stringify({ success: false, error: error.message }),
              tool_call_id: toolId,
            }))
          }
        }

        task.results.push(stepResult)

        // 진행 상황 콜백
        if (onProgress) {
          onProgress(stepResult)
        }
      }
    }

    task.status = isComplete ? 'completed' : 'completed'

    // 응답 정리
    let cleanMessage = finalMessage
    cleanMessage = cleanMessage.replace(/<think>[\s\S]*?<\/think>\s*/g, '')
    cleanMessage = cleanMessage.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, '')

    return {
      task,
      message: cleanMessage || '작업을 완료했습니다.',
      actions,
      isComplete,
    }
  } catch (error: any) {
    console.error('[AutonomousAgent] Error:', error)
    task.status = 'failed'
    task.error = error.message

    return {
      task,
      message: `작업 중 오류가 발생했습니다: ${error.message}`,
      actions,
      isComplete: false,
    }
  }
}
